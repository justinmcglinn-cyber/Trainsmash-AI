package com.trainsmash.arwprocessor

import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore

class ArwProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "ArwProcessor"

    /**
     * Extract embedded JPEG preview from a RAW file (ARW, DNG, NEF, etc.).
     * Returns a WritableMap with keys: dataUrl (String), width (Int), height (Int).
     */
    @ReactMethod
    fun extractPreview(uri: String, promise: Promise) {
        scope.launch {
            try {
                val result = extractSingle(uri)
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
     * Resolves with an array of {uri, dataUrl, width, height} objects.
     */
    @ReactMethod
    fun extractPreviews(fileUris: ReadableArray, promise: Promise) {
        scope.launch {
            try {
                val uris = (0 until fileUris.size()).map { fileUris.getString(it)!! }
                val semaphore = Semaphore(4)

                // coroutineScope ensures all async blocks complete before we continue
                val results = coroutineScope {
                    uris.map { uri ->
                        async {
                            semaphore.acquire()
                            try {
                                extractSingle(uri)
                            } finally {
                                semaphore.release()
                            }
                        }
                    }.awaitAll()
                }

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

        val tiff = TiffParser(bytes)
        val jpegBytes = tiff.extractEmbeddedJpeg()
        val captureDate = tiff.extractCaptureDate()
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size, opts)
        val base64Str = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)

        return Arguments.createMap().apply {
            putString("uri", uri)
            putString("dataUrl", "data:image/jpeg;base64,$base64Str")
            putInt("width", opts.outWidth)
            putInt("height", opts.outHeight)
            if (captureDate != null) putString("captureDate", captureDate)
        }
    }

    override fun invalidate() {
        super.invalidate()
        scope.cancel()
    }
}
