package lv.turiba.next

import lv.turiba.next.source.SourceClient
import lv.turiba.next.core.ScheduleException
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.Assert.*
import javax.net.ssl.HttpsURLConnection
import java.net.URL
import java.net.SocketTimeoutException
import java.io.ByteArrayInputStream
import java.security.cert.Certificate

class SourceClientTest {
    private class Response(val status: Int=200,val body: ByteArray="<html></html>".toByteArray(),val mime: String="text/html",val timeout: Boolean=false): HttpsURLConnection(URL("https://nodarbibas.turiba.lv/")) {
        var closed=false
        override fun connect() { }
        override fun disconnect() { closed=true }
        override fun usingProxy()=false
        override fun getCipherSuite()="TLS_AES_128_GCM_SHA256"
        override fun getLocalCertificates(): Array<Certificate>?=null
        override fun getServerCertificates(): Array<Certificate> = emptyArray()
        override fun getResponseCode(): Int { if(timeout) throw SocketTimeoutException(); return status }
        override fun getContentType()=mime
        override fun getInputStream()=ByteArrayInputStream(body)
    }
    private fun error(code: String,response: Response,elapsed: ()->Long = {0})=runBlocking {
        try { SourceClient({response},elapsed).html("https://nodarbibas.turiba.lv/"); fail("Expected $code") }
        catch(e: ScheduleException) { assertEquals(code,e.code) }
        assertTrue(response.closed)
    }
    @Test fun unsafeHostIsRejectedBeforeConnection()=runBlocking {
        var opened=false
        try { SourceClient({opened=true; Response()}).html("https://nodarbibas.turiba.lv.evil.test/");fail() }
        catch(e: ScheduleException) { assertEquals("UNSAFE_SOURCE",e.code) }
        assertFalse(opened)
    }
    @Test fun redirectsNonHtmlAndUnboundedBodiesAreRejected() {
        error("UNSAFE_REDIRECT",Response(status=302))
        error("HTTP_ERROR",Response(status=503))
        error("INVALID_RESPONSE",Response(mime="application/json"))
        error("INVALID_RESPONSE",Response(body=ByteArray(2_000_001)))
        error("INVALID_RESPONSE",Response(body=byteArrayOf()))
    }
    @Test fun timeoutsAreTypedAndTotalReadBudgetIsBounded() {
        error("NETWORK_TIMEOUT",Response(timeout=true))
        var t=0L
        error("NETWORK_TIMEOUT",Response()) { t+=21_000;t }
    }
    @Test fun validUtf8UsesBoundedHttpsWithoutFollowingRedirects()=runBlocking {
        val response=Response(body="Rīga Āčēģīķļņšūž".toByteArray())
        assertEquals("Rīga Āčēģīķļņšūž",SourceClient({response}).html("https://nodarbibas.turiba.lv/"))
        assertFalse(response.instanceFollowRedirects)
        assertEquals(20_000,response.connectTimeout)
        assertTrue(response.closed)
    }
}
