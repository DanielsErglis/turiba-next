package lv.turiba.next.core

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime

class ScheduleException(val code: String) : IllegalArgumentException(code)
internal fun checkSource(value: Boolean, code: String = "SOURCE_STRUCTURE_CHANGED") {
    if (!value) throw ScheduleException(code)
}

data class CatalogEntry(val code: String, val branch: String, val source: String)
data class Lesson(
    val date: LocalDate, val startTime: LocalTime, val endTime: LocalTime,
    val subject: String, val room: String?, val period: Int, val group: String,
    val sourceGroup: String, val subgroup: String?, val category: String, val type: String,
    val elective: Boolean, val requiresSelection: Boolean, val provisional: Boolean,
    val individualSchedule: Boolean, val deliveryModeUnspecified: Boolean,
    val changed: Boolean, val source: String
) {
    val start: Instant get() = Riga.instant(date, startTime)
    val end: Instant get() = Riga.instant(date, endTime)
    val choiceKey: String get() = Json.array(sourceGroup, subject)
}
data class Week(
    val group: String, val branch: String?, val weekStart: LocalDate, val weekEnd: LocalDate,
    val status: String, val navigation: Map<String, String>, val lessons: List<Lesson>, val warnings: List<String>
)
data class ScheduleState(
    val status: String, val current: Lesson? = null, val next: Lesson? = null,
    val concurrent: List<Lesson> = emptyList(), val offline: Boolean = false,
    val stale: Boolean = false, val issue: String? = null,
    val selectionRequired: Boolean = false, val coverageIncomplete: Boolean = false,
    val refreshAt: Instant
)

object Json {
    fun quote(value: String): String = buildString {
        append('"')
        for (c in value) when (c) {
            '"' -> append("\\\""); '\\' -> append("\\\\")
            '\b' -> append("\\b"); '\u000c' -> append("\\f")
            '\n' -> append("\\n"); '\r' -> append("\\r"); '\t' -> append("\\t")
            else -> if (c.code < 32) append("\\u%04x".format(c.code)) else append(c)
        }
        append('"')
    }
    fun array(vararg values: String): String = values.joinToString(",", "[", "]") { quote(it) }
}

fun normalizeGroup(value: String): String {
    val result = value.trim().uppercase(java.util.Locale.ROOT)
    checkSource(Regex("^[A-Z0-9][A-Z0-9_/-]{1,31}$").matches(result), "INVALID_GROUP")
    return result
}
