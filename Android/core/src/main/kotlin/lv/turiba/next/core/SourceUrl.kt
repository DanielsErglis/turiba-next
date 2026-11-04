package lv.turiba.next.core

import java.net.URI
import java.net.URLEncoder

object SourceUrl {
    fun validate(value: String): URI {
        val uri = try { URI(value) } catch (_: Exception) { throw ScheduleException("UNSAFE_SOURCE") }
        checkSource(uri.scheme == "https" && uri.host == "nodarbibas.turiba.lv" && uri.rawUserInfo == null &&
            (uri.port == -1 || uri.port == 443) && uri.fragment == null, "UNSAFE_SOURCE")
        return uri
    }
    fun encode(value: String): String = URLEncoder.encode(value, "UTF-8").replace("+", "%20")
    fun schedule(group: String, offset: Int): String {
        checkSource(offset in 0..16, "INVALID_WEEK")
        return Parser.ORIGIN + "pub_nod.asp?Grupa=" + encode(normalizeGroup(group)) + "&ned=" + offset
    }
}

object ReminderIdentity {
    private fun hash(value: String, seed: UInt): String {
        var result = seed
        for (c in value) result = (result xor c.code.toUInt()) * 16777619u
        return result.toString(16).padStart(8, '0')
    }
    fun fingerprint(value: String): String = hash(value, 2166136261u) + hash(value, 3339675911u)
}
