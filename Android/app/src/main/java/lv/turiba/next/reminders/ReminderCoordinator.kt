package lv.turiba.next.reminders

import lv.turiba.next.core.*
import lv.turiba.next.settings.Settings
import lv.turiba.next.storage.*
import java.time.Instant

interface ReminderPlatform {
    fun permitted(): Boolean
    fun schedule(record: ReminderRecord)
    fun cancel(record: ReminderRecord)
    fun cancelOwnedActive()
    fun post(record: ReminderRecord): Boolean
    fun deleteOwnedChannels() { }
}
enum class DeliveryResult { OFF,NOT_FOUND,DUPLICATE,OBSOLETE,PERMISSION_DENIED,UNVERIFIED,TOO_LATE,NOT_DUE,CHANGED,POSTED }

class ReminderCoordinator(private val repository: Repository,private val platform: ReminderPlatform,
                          private val localization: (Settings)->Pair<String,String>) {
    private val dao get()=repository.db.schedule()
    private fun owns(record: ReminderRecord)=record.owner==Reminders.OWNER && record.id.startsWith(Reminders.PREFIX)
    suspend fun cancelOwned()=repository.withCurrentState { cancelOwnedWhileLocked() }
    // Only called by deletion while the repository mutation lock is already held.
    internal suspend fun cancelOwnedWhileLocked(deleteChannels: Boolean=false) {
        dao.reminders().filter(::owns).forEach { platform.cancel(it);dao.removeReminder(it.id) }
        platform.cancelOwnedActive()
        if(deleteChannels) platform.deleteOwnedChannels()
    }
    suspend fun reconcile(forceReschedule: Boolean=false)=repository.withCurrentState { snapshot ->
        val settings=snapshot.settings
        // OFF does not inspect permissions, registry, plan or any platform API.
        if(!settings.reminders || settings.group==null) return@withCurrentState
        if(!platform.permitted()) {
            cancelOwnedWhileLocked()
            repository.saveSettingsWhileLocked(settings.copy(reminders=false))
            return@withCurrentState
        }
        val now=snapshot.asOf
        val (language,noRoom)=localization(settings)
        val choices=settings.choices[settings.group].orEmpty()
        val generation=dao.generation()?.value ?: 0L
        val fresh=Reminders.plan(true,settings.group,choices,snapshot.weeks.filter { it.weekStart.toString() in snapshot.verifiedWeeks },now,settings.leadMinutes,language,noRoom)
        val selected=Engine.selected(snapshot.weeks.flatMap { it.lessons },settings.group,choices).filter { !it.provisional }.associateBy(Reminders::identity)
        val allKnown=snapshot.weeks.flatMap { it.lessons }.associateBy(Reminders::identity)
        val existing=dao.reminders().filter(::owns)
        for(record in existing) {
            val lesson=selected[record.identity]
            val invalid=record.groupCode!=settings.group || record.generation!=generation ||
                lesson!=null && lesson.start<=now ||
                record.identity in allKnown && lesson==null ||
                record.weekStart in snapshot.verifiedWeeks && lesson==null ||
                record.triggerAt<now.minusSeconds(7*86400L).toEpochMilli()
            if(invalid) { platform.cancel(record);dao.removeReminder(record.id);continue }
            if(record.delivered || lesson==null) continue
            val reference=minOf(now,lesson.start.minusSeconds(settings.leadMinutes*60L).minusMillis(1))
            val desired=Reminders.plan(true,settings.group,choices,snapshot.weeks,reference,settings.leadMinutes,language,noRoom).find { it.id==record.id }
            if(desired!=null && desired.fingerprint!=record.fingerprint) {
                platform.cancel(record)
                if(desired.trigger>now) {
                    val updated=record.copy(triggerAt=desired.trigger.toEpochMilli(),fingerprint=desired.fingerprint,body=desired.body)
                    dao.putReminder(updated);platform.schedule(updated)
                } else dao.removeReminder(record.id)
            } else if(forceReschedule && record.triggerAt>now.toEpochMilli()) platform.schedule(record)
        }
        for(desired in fresh) {
            val current=dao.reminder(desired.id)
            if(current!=null && current.identity!=desired.identity) throw ScheduleException("NOTIFICATION_ID_COLLISION")
            if(current?.delivered==true) continue
            if(current==null || current.fingerprint!=desired.fingerprint) {
                val record=ReminderRecord(desired.id,Reminders.OWNER,desired.identity,settings.group,desired.weekStart,
                    desired.trigger.toEpochMilli(),desired.fingerprint,desired.body,generation)
                dao.putReminder(record);platform.schedule(record)
            }
        }
    }
    suspend fun deliver(id: String)=repository.withCurrentState { snapshot ->
        if(!snapshot.settings.reminders || snapshot.settings.group==null) return@withCurrentState DeliveryResult.OFF
        val record=dao.reminder(id)?.takeIf(::owns) ?: return@withCurrentState DeliveryResult.NOT_FOUND
        if(record.delivered) return@withCurrentState DeliveryResult.DUPLICATE
        if(record.groupCode!=snapshot.settings.group || record.generation!=(dao.generation()?.value ?: 0L)) return@withCurrentState DeliveryResult.OBSOLETE
        if(!platform.permitted()) return@withCurrentState DeliveryResult.PERMISSION_DENIED
        val settings=snapshot.settings
        val lesson=Engine.selected(snapshot.weeks.flatMap { it.lessons },settings.group,settings.choices[settings.group].orEmpty())
            .find { Reminders.identity(it)==record.identity && !it.provisional } ?: return@withCurrentState DeliveryResult.UNVERIFIED
        if(lesson.start<=snapshot.asOf) return@withCurrentState DeliveryResult.TOO_LATE
        if(record.triggerAt>snapshot.asOf.toEpochMilli()) return@withCurrentState DeliveryResult.NOT_DUE
        val (language,noRoom)=localization(settings)
        val desired=Reminders.plan(true,settings.group,settings.choices[settings.group].orEmpty(),snapshot.weeks,
            Instant.ofEpochMilli(record.triggerAt).minusMillis(1),settings.leadMinutes,language,noRoom).find { it.id==id } ?: return@withCurrentState DeliveryResult.UNVERIFIED
        if(desired.fingerprint!=record.fingerprint) return@withCurrentState DeliveryResult.CHANGED
        // Notification posting is serialized with Delete My Data; deletion cancels an earlier post.
        if(platform.post(record)) { dao.putReminder(record.copy(delivered=true));DeliveryResult.POSTED } else DeliveryResult.PERMISSION_DENIED
    }
}
