package lv.turiba.next.core

import java.time.Instant

data class Reminder(val id: String,val identity: String,val trigger: Instant,val body: String,val fingerprint: String,val weekStart: String)
object Reminders {
    const val PREFIX="turiba-next.v1."
    const val OWNER="turiba-next"
    fun identity(lesson: Lesson): String = "[${Json.quote(lesson.group)},${Json.quote(lesson.date.toString())},${Json.quote(lesson.startTime.toString())},${lesson.period},${Json.quote(lesson.subject)},${Json.quote(lesson.sourceGroup)}]"
    fun plan(enabled: Boolean,group: String?,choices: Set<String>,weeks: List<Week>,now: Instant,
             leadMinutes: Int,language: String,noRoom: String): List<Reminder> {
        if(!enabled || group==null) return emptyList()
        checkSource(leadMinutes in listOf(5,10,15,30),"INVALID_SETTINGS")
        val seen=mutableMapOf<String,String>()
        return buildList {
            val lessons=Engine.selected(weeks.filter { it.status=="published" }.flatMap { it.lessons },group,choices).sortedBy { it.start }
            for(lesson in lessons) {
                if(lesson.provisional) continue
                val trigger=lesson.start.minusSeconds(leadMinutes*60L)
                if(trigger<=now || trigger>now.plusSeconds(7*86400L)) continue
                val identity=identity(lesson);val id=PREFIX+ReminderIdentity.fingerprint(identity)
                checkSource(id !in seen || seen[id]==identity,"NOTIFICATION_ID_COLLISION")
                if(id in seen) continue
                seen[id]=identity
                val body="${lesson.startTime} · ${lesson.subject} · ${lesson.room ?: noRoom}"
                val mark=ReminderIdentity.fingerprint("[${trigger.toEpochMilli()},${Json.quote(body)},${Json.quote(language)}]")
                add(Reminder(id,identity,trigger,body,mark,Riga.weekStart(lesson.date).toString()))
                if(size==32) break
            }
        }
    }
}
