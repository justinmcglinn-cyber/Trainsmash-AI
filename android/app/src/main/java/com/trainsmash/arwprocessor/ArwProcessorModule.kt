package com.trainsmash.arwprocessor

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import kotlinx.coroutines.*

class ArwProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ArwProcessor"

    /**
     * Extract embedded JPEG preview from a RAW file (ARW, DNG, NEF, etc.).
     * Returns a WritableMap with keys: dataUrl (String), width (Int), height (Int).
     */
    @ReactMethod
    fun extractPreview(uri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val contentUri = Uri.parse(uri)
                val resolver = reactContext.contentResolver

                val inputStream = resolver.openInputStream(contentUri)
                    ?: throw IllegalArgumentException("Cannot open URI: $uri")

                val bytes = inputStream.readBytes()
                inputStream.close()

                val jpegBytes = TiffParser(bytes).extractEmbeddedJpeg()

                // Decode dimensions without loading full bitmap
                val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size, opts)

                val base64Str = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
                val dataUrl = "data:image/jpeg;base64,$base64Str"

                val result = Arguments.createMap().apply {
                    putString("dataUrl", dataUrl)
                    putInt("width", opts.outWidth)
                    putInt("height", opts.outHeight)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ARW_PARSE_ERROR", e.message ?: "Unknown error", e)
                }
            }
        }
    }

    /**
     * Extract previews from multiple RAW files in parallel (up to 4 concurrent).
     * fileUris: JS array of URI strings.
     * Resolves with an array of {dataUrl, width, height} objects.
     */
    @ReactMethod
    fun extractPreviews(fileUris: ReadableArray, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val uris = (0 until fileUris.size()).map { fileUris.getString(it)!! }

                // Process in parallel with a semaphore capping concurrency at 4
                val semaphore = kotlinx.coroutines.sync.Semaphore(4)
                val results = uris.map { uri ->
                    async {
                        semaphore.acquire()
                        try {
                            extractSingle(uri)
                        } finally {
                            semaphore.release()
                        }
                    }
                }.awaitAll()

                val resultArray = Arguments.createArray()
                for (r in results) {
                    resultArray.pushMap(r)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(resultArray)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ARW_BATCH_ERROR", e.message ?: "Unknown error", e)
                }
            }
        }
    }

    private fun extractSingle(uri: String): WritableMap {
        val contentUri = Uri.parse(uri)
        val resolver = reactContext.contentResolver
        val inputStream = resolver.openInputStream(contentUri)
            ?: throw IllegalArgumentException("Cannot open URI: $uri")
        val bytes = inputStream.readBytes()
        inputStream.close()

        val jpegBytes = TiffParser(bytes).extractEmbeddedJpeg()
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size, opts)
        val base64Str = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)

        return Arguments.createMap().apply {
            putString("uri", uri)
            putString("dataUrl", "data:image/jpeg;base64,$base64Str")
            putInt("width", opts.outWidth)
            putInt("height", opts.outHeight)
        }
    }
}
