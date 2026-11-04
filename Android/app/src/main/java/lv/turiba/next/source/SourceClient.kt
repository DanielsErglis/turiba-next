package lv.turiba.next.source

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import lv.turiba.next.core.*
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import javax.net.ssl.HttpsURLConnection

interface TimetableSource {
    suspend fun html(url: String): String
    suspend fun catalog(): List<CatalogEntry>
}
class SourceClient(private val open: (java.net.URI)->HttpsURLConnection = { it.toURL().openConnection() as HttpsURLConnection },
                   private val elapsed: ()->Long = android.os.SystemClock::elapsedRealtime) : TimetableSource {
    override suspend fun html(url: String): String = withContext(Dispatchers.IO) {
        val uri = SourceUrl.validate(url)
        val connection = try { open(uri) } catch(_: java.io.IOException) { throw ScheduleException("NETWORK_ERROR") }
        val deadline=elapsed()+20_000
        try {
            connection.instanceFollowRedirects=false
            connection.connectTimeout=20_000; connection.readTimeout=20_000
            connection.requestMethod="GET"
            connection.setRequestProperty("Accept","text/html")
            // The source redirects agents containing "Android" to a different mobile HTML format.
            // Request the captured desktop contract directly; redirects remain forbidden.
            connection.setRequestProperty("User-Agent","TURIBA-NEXT/0.1")
            val status=connection.responseCode
            if (status in 300..399) throw ScheduleException("UNSAFE_REDIRECT")
            if (status != HttpURLConnection.HTTP_OK) throw ScheduleException("HTTP_ERROR")
            if (!Regex("^text/html(?:\\s*;|$)",RegexOption.IGNORE_CASE).containsMatchIn(connection.contentType.orEmpty())) throw ScheduleException("INVALID_RESPONSE")
            val bytes=connection.inputStream.use { input ->
                val output=java.io.ByteArrayOutputStream()
                val buffer=ByteArray(8192)
                while (true) {
                    val remaining=deadline-elapsed()
                    if(remaining<=0) throw SocketTimeoutException()
                    connection.readTimeout=remaining.coerceAtMost(20_000).toInt()
                    val count=input.read(buffer)
                    if (count<0) break
                    output.write(buffer,0,count)
                    if (output.size()>2_000_000) throw ScheduleException("INVALID_RESPONSE")
                }
                output.toByteArray()
            }
            if (bytes.isEmpty() || bytes.size>2_000_000) throw ScheduleException("INVALID_RESPONSE")
            try {
                Charsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
                    .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(bytes)).toString()
            } catch(_: java.nio.charset.CharacterCodingException) { throw ScheduleException("INVALID_RESPONSE") }
        } catch (e: ScheduleException) { throw e }
        catch (_: SocketTimeoutException) { throw ScheduleException("NETWORK_TIMEOUT") }
        catch (_: java.io.IOException) { throw ScheduleException("NETWORK_ERROR") }
        finally { connection.disconnect() }
    }
    override suspend fun catalog(): List<CatalogEntry> {
        val catalogs=mutableListOf<List<CatalogEntry>>()
        for (path in Parser.catalogPaths) catalogs.add(Parser.catalog(html(Parser.ORIGIN+path)))
        return Parser.mergeCatalogs(catalogs)
    }
}
