package com.trainsmash.arwprocessor

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Minimal TIFF/IFD parser for extracting embedded JPEG previews from RAW files
 * (Sony ARW, Nikon NEF, Canon CR2, Adobe DNG, etc.).
 *
 * Sony ARW is TIFF-based. The full-res JPEG preview lives in a SubIFD.
 * IFD0 → tag 0x014A (SubIFDs) → SubIFD0 → JPEGInterchangeFormat / StripOffsets
 */
class TiffParser(private val data: ByteArray) {

    private var buf: ByteBuffer = ByteBuffer.wrap(data)
    private var littleEndian: Boolean = true

    companion object {
        // TIFF tag constants
        private const val TAG_SUBIFDS = 0x014A
        private const val TAG_JPEG_INTERCHANGE_FORMAT = 0x0201
        private const val TAG_JPEG_INTERCHANGE_FORMAT_LENGTH = 0x0202
        private const val TAG_STRIP_OFFSETS = 0x0111
        private const val TAG_STRIP_BYTE_COUNTS = 0x0117
        private const val TAG_IMAGE_WIDTH = 0x0100
        private const val TAG_IMAGE_HEIGHT = 0x0101
        private const val TAG_COMPRESSION = 0x0103
        private const val COMPRESSION_JPEG = 6

        // TIFF type sizes
        private val TYPE_SIZES = intArrayOf(0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8)
    }

    data class IfdEntry(val tag: Int, val type: Int, val count: Long, val valueOrOffset: Long)
    data class JpegBlock(val offset: Int, val length: Int, val width: Int = 0, val height: Int = 0)

    fun extractEmbeddedJpeg(): ByteArray {
        buf = ByteBuffer.wrap(data)
        parseHeader()

        val ifd0Offset = readUInt32().toInt()
        val ifd0Entries = parseIfd(ifd0Offset)

        // Strategy 1: Walk SubIFDs (Sony ARW primary path)
        val subIfdEntry = ifd0Entries.find { it.tag == TAG_SUBIFDS }
        if (subIfdEntry != null) {
            val subIfdOffsets = readSubIfdOffsets(subIfdEntry)
            for (offset in subIfdOffsets) {
                val jpeg = tryExtractJpegFromIfd(offset)
                if (jpeg != null) return jpeg
            }
        }

        // Strategy 2: Check IFD0 directly for embedded JPEG
        val jpeg = tryExtractJpegFromEntries(ifd0Entries)
        if (jpeg != null) return jpeg

        // Strategy 3: Scan for additional IFDs
        val nextIfdOffset = getNextIfdOffset(ifd0Offset, ifd0Entries)
        if (nextIfdOffset > 0) {
            val jpeg2 = tryExtractJpegFromIfd(nextIfdOffset)
            if (jpeg2 != null) return jpeg2
        }

        // Strategy 4: Raw scan for JPEG SOI marker (last resort)
        return scanForJpeg()
    }

    private fun parseHeader() {
        val byteOrder1 = data[0].toInt() and 0xFF
        val byteOrder2 = data[1].toInt() and 0xFF
        littleEndian = (byteOrder1 == 'I'.code && byteOrder2 == 'I'.code)
        buf.order(if (littleEndian) ByteOrder.LITTLE_ENDIAN else ByteOrder.BIG_ENDIAN)
        buf.position(0)
        // Skip byte order mark (2 bytes) + magic number 42 (2 bytes)
        buf.position(4)
    }

    private fun parseIfd(offset: Int): List<IfdEntry> {
        if (offset <= 0 || offset + 2 > data.size) return emptyList()
        buf.position(offset)
        val count = readUInt16().toInt()
        val entries = mutableListOf<IfdEntry>()
        repeat(count) {
            if (buf.remaining() >= 12) {
                val tag = readUInt16().toInt()
                val type = readUInt16().toInt()
                val cnt = readUInt32()
                val valOrOff = readUInt32()
                entries.add(IfdEntry(tag, type, cnt, valOrOff))
            }
        }
        return entries
    }

    private fun getNextIfdOffset(ifdOffset: Int, entries: List<IfdEntry>): Int {
        // IFD ends with: count × 12 bytes + 4-byte next IFD offset
        val pos = ifdOffset + 2 + entries.size * 12
        if (pos + 4 > data.size) return 0
        buf.position(pos)
        return readUInt32().toInt()
    }

    private fun readSubIfdOffsets(entry: IfdEntry): List<Int> {
        val offsets = mutableListOf<Int>()
        val count = entry.count.toInt()
        if (count == 1) {
            offsets.add(entry.valueOrOffset.toInt())
        } else {
            val pos = entry.valueOrOffset.toInt()
            for (i in 0 until count) {
                if (pos + i * 4 + 4 <= data.size) {
                    buf.position(pos + i * 4)
                    offsets.add(readUInt32().toInt())
                }
            }
        }
        return offsets
    }

    private fun tryExtractJpegFromIfd(offset: Int): ByteArray? {
        val entries = parseIfd(offset)
        return tryExtractJpegFromEntries(entries)
    }

    private fun tryExtractJpegFromEntries(entries: List<IfdEntry>): ByteArray? {
        // Method 1: JPEGInterchangeFormat (most DNG/ARW SubIFDs)
        val jifEntry = entries.find { it.tag == TAG_JPEG_INTERCHANGE_FORMAT }
        val jifLenEntry = entries.find { it.tag == TAG_JPEG_INTERCHANGE_FORMAT_LENGTH }
        if (jifEntry != null && jifLenEntry != null) {
            val jOffset = jifEntry.valueOrOffset.toInt()
            val jLen = jifLenEntry.valueOrOffset.toInt()
            if (jOffset > 0 && jLen > 0 && jOffset + jLen <= data.size) {
                val jpeg = data.copyOfRange(jOffset, jOffset + jLen)
                if (isValidJpeg(jpeg)) return jpeg
            }
        }

        // Method 2: StripOffsets + StripByteCounts (some ARW SubIFDs store JPEG strips)
        val stripOffsetsEntry = entries.find { it.tag == TAG_STRIP_OFFSETS }
        val stripCountsEntry = entries.find { it.tag == TAG_STRIP_BYTE_COUNTS }
        val compressionEntry = entries.find { it.tag == TAG_COMPRESSION }

        if (stripOffsetsEntry != null && stripCountsEntry != null) {
            val isJpegCompression = compressionEntry?.valueOrOffset?.toInt() == COMPRESSION_JPEG
            val offset = stripOffsetsEntry.valueOrOffset.toInt()
            val length = stripCountsEntry.valueOrOffset.toInt()
            if (offset > 0 && length > 1024 && offset + length <= data.size) {
                val candidate = data.copyOfRange(offset, offset + length)
                if (isValidJpeg(candidate)) return candidate
            }
        }

        return null
    }

    private fun scanForJpeg(): ByteArray {
        // Scan from byte 100 onwards to skip TIFF header area
        // Look for JPEG SOI (FFD8) followed by JFIF or Exif APP0/APP1
        var bestOffset = -1
        var bestSize = 0

        var i = 100
        while (i < data.size - 4) {
            if (data[i].toInt() and 0xFF == 0xFF && data[i + 1].toInt() and 0xFF == 0xD8) {
                // Found SOI — scan forward for EOI (FFD9)
                var j = i + 2
                while (j < data.size - 1) {
                    if (data[j].toInt() and 0xFF == 0xFF && data[j + 1].toInt() and 0xFF == 0xD9) {
                        val size = j + 2 - i
                        if (size > bestSize) {
                            bestOffset = i
                            bestSize = size
                        }
                        break
                    }
                    j++
                }
                i = j + 2
            } else {
                i++
            }
        }

        if (bestOffset >= 0 && bestSize > 0) {
            return data.copyOfRange(bestOffset, bestOffset + bestSize)
        }

        throw IllegalStateException("No embedded JPEG found in file")
    }

    private fun isValidJpeg(data: ByteArray): Boolean {
        return data.size > 4 &&
            data[0].toInt() and 0xFF == 0xFF &&
            data[1].toInt() and 0xFF == 0xD8 &&
            data[data.size - 2].toInt() and 0xFF == 0xFF &&
            data[data.size - 1].toInt() and 0xFF == 0xD9
    }

    private fun readUInt16(): Int {
        val b0 = buf.get().toInt() and 0xFF
        val b1 = buf.get().toInt() and 0xFF
        return if (littleEndian) b0 or (b1 shl 8) else (b0 shl 8) or b1
    }

    private fun readUInt32(): Long {
        val b0 = buf.get().toLong() and 0xFF
        val b1 = buf.get().toLong() and 0xFF
        val b2 = buf.get().toLong() and 0xFF
        val b3 = buf.get().toLong() and 0xFF
        return if (littleEndian)
            b0 or (b1 shl 8) or (b2 shl 16) or (b3 shl 24)
        else
            (b0 shl 24) or (b1 shl 16) or (b2 shl 8) or b3
    }
}
