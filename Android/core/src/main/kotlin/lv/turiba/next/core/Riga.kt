package lv.turiba.next.core

import java.time.*
import java.time.temporal.TemporalAdjusters

object Riga {
    val zone: ZoneId = ZoneId.of("Europe/Riga")
    enum class Disambiguation { REJECT, EARLIER, LATER }
    fun instant(date: LocalDate, time: LocalTime, mode: Disambiguation = Disambiguation.REJECT): Instant {
        val wall = LocalDateTime.of(date, time)
        val offsets = zone.rules.getValidOffsets(wall)
        checkSource(offsets.isNotEmpty(), "NONEXISTENT_LOCAL_TIME")
        checkSource(offsets.size == 1 || mode != Disambiguation.REJECT, "AMBIGUOUS_LOCAL_TIME")
        return wall.toInstant(if (mode == Disambiguation.LATER) offsets.last() else offsets.first())
    }
    fun today(now: Instant): LocalDate = now.atZone(zone).toLocalDate()
    fun weekStart(date: LocalDate): LocalDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    fun serverWeek(now: Instant): LocalDate = today(now).let { if (it.dayOfWeek == DayOfWeek.SUNDAY) it.plusDays(1) else weekStart(it) }
}

object Engine {
    fun selected(lessons: List<Lesson>, group: String, choices: Set<String>): List<Lesson> =
        lessons.filter { it.group == group && (!it.requiresSelection || it.choiceKey in choices) }

    fun state(group: String?, weeks: List<Week>, choices: Set<String>, now: Instant,
              offline: Boolean = false, stale: Boolean = false, issue: String? = null): ScheduleState {
        var refresh = now.plusSeconds(900)
        if (group == null) return ScheduleState("setupRequired", offline = offline, stale = stale, issue = issue, refreshAt = refresh)
        val today = Riga.today(now)
        val valid = weeks.filter { it.group == group && it.status == "published" }
        val coverage = valid.any { today >= it.weekStart && today <= it.weekEnd }
        val raw = valid.flatMap { it.lessons }
        val lessons = selected(raw, group, choices).sortedWith(compareBy<Lesson> { it.start }.thenBy { it.end }.thenBy { it.subject })
        lessons.forEach { checkSource(it.end > it.start, "INVALID_LESSON") }
        val active = lessons.filter { it.start <= now && now < it.end }
        val future = lessons.filter { it.start > now }
        var current: Lesson? = null
        var next: Lesson? = null
        val status = when {
            active.isNotEmpty() -> { current = active.first(); next = future.firstOrNull(); "ongoing" }
            future.isNotEmpty() -> {
                if (coverage && future.first().date != today && lessons.any { it.date == today && it.end <= now }) {
                    next = future.first(); "finished"
                } else {
                    current = future.first(); next = future.drop(1).firstOrNull()
                    if (now >= current.start.minusSeconds(600)) "soon" else "upcoming"
                }
            }
            coverage -> if (lessons.any { it.date == today && it.end <= now }) "finished" else "noSchedule"
            else -> "error"
        }
        val boundaries = lessons.flatMap { listOf(it.start.minusSeconds(600), it.start, it.end) } + Riga.instant(today.plusDays(1), LocalTime.MIDNIGHT)
        refresh = (boundaries.filter { it > now } + refresh).min()
        return ScheduleState(status, current, next, active.drop(1), offline, stale,
            issue ?: if (status == "error") "SCHEDULE_UNAVAILABLE" else null,
            raw.any { it.requiresSelection && it !in lessons }, !coverage, refresh)
    }
}
