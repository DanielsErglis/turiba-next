package lv.turiba.next.storage

import androidx.room.withTransaction
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import lv.turiba.next.core.*
import lv.turiba.next.settings.*
import lv.turiba.next.source.TimetableSource
import java.time.*

data class Snapshot(val settings: Settings, val group: String?, val weeks: List<Week>, val state: ScheduleState, val lastSync: Instant?, val verifiedWeeks: Set<String>)

class Repository(val db: ScheduleDatabase, val settings: SettingsStore, private val source: TimetableSource,
                 private val scope: CoroutineScope, private val clock: ()->Instant = Instant::now) {
    private val dao=db.schedule()
    private val guard=Mutex()
    private val flightsGuard=Mutex()
    private val catalogGuard=Mutex()
    private val flights=mutableMapOf<String,Deferred<Unit>>()
    val revision=MutableStateFlow(0L)
    private fun changed() { revision.value++ }
    suspend fun edit(transform: (Settings)->Settings) = guard.withLock {
        settings.save(transform(settings.read())); changed()
    }
    suspend fun setWidget(id: Int, group: String) = guard.withLock {
        dao.putWidget(WidgetRecord(id,normalizeGroup(group))); changed()
    }
    suspend fun removeWidget(id: Int) = guard.withLock { dao.removeWidget(id); changed() }
    suspend fun widgets()=dao.widgets()
    suspend fun validateGroup(group: String) {
        synchronize(group,true)
        if (dao.catalog().none { it.code==group && clock().toEpochMilli()-it.syncedAt in 0 until 604_800_000 }) {
            throw ScheduleException(dao.sync(group)?.issue ?: "UNKNOWN_GROUP")
        }
    }
    suspend fun deleteData(cancelOwnedWork: suspend ()->Unit) = guard.withLock {
        // Persist generation first; workers completing after this point cannot reinstall old data.
        db.withTransaction { dao.erase() }
        settings.clear()
        cancelOwnedWork()
        changed()
    }
    suspend fun synchronize(groupValue: String, force: Boolean = false) {
        val group=normalizeGroup(groupValue)
        val flight=flightsGuard.withLock {
            flights[group]?.takeIf { !it.isCompleted } ?: scope.async(Dispatchers.IO) { perform(group,force) }.also { flights[group]=it }
        }
        try { flight.await() } finally {
            flightsGuard.withLock { if (flights[group]===flight && flight.isCompleted) flights.remove(group) }
        }
    }
    private suspend fun catalog(now: Instant, force: Boolean, generation: Long): List<CatalogEntry> = catalogGuard.withLock {
        val cached=dao.catalog().takeIf { records -> records.all {
            try { normalizeGroup(it.code)==it.code && it.branch in listOf("riga","cesis","liepaja","talsi") && SourceUrl.validate(it.source).host=="nodarbibas.turiba.lv" }
            catch(_: Exception) { false }
        } }.orEmpty()
        val age=now.toEpochMilli()-(cached.minOfOrNull { it.syncedAt } ?: 0)
        if (cached.isNotEmpty() && age>=0 && age<(if(force) 20_000 else 86_400_000)) return@withLock cached.map { CatalogEntry(it.code,it.branch,it.source) }
        try {
            val catalog=source.catalog()
            guard.withLock {
                ensureGeneration(generation)
                db.withTransaction { dao.clearCatalog(); dao.putCatalog(catalog.map { GroupRecord(it.code,it.branch,it.source,now.toEpochMilli()) }) }
            }
            catalog
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) {
            if (cached.isNotEmpty() && age in 0 until 604_800_000) cached.map { CatalogEntry(it.code,it.branch,it.source) } else throw e
        }
    }
    private suspend fun ensureGeneration(expected: Long) {
        if ((dao.generation()?.value ?: 0)!=expected) throw CancellationException("Data deleted")
    }
    private suspend fun perform(group: String, force: Boolean) = withContext(Dispatchers.IO) {
        val (generation,marker)=guard.withLock { (dao.generation()?.value ?: 0) to dao.sync(group) }
        val now=clock()
        if (!force && marker != null && now.toEpochMilli()-marker.attemptedAt in 0 until 900_000) return@withContext
        val verified=mutableListOf<String>(); var issue: String?=null
        try {
            val entries=catalog(now,force,generation)
            if (entries.none { it.code==group }) throw ScheduleException("UNKNOWN_GROUP")
            val server=Riga.serverWeek(now)
            for (offset in if (server==Riga.weekStart(Riga.today(now))) listOf(0,1) else listOf(0)) {
                try {
                    val url=SourceUrl.schedule(group,offset)
                    val week=Parser.schedule(source.html(url),group,entries,server.plusDays(offset*7L),url)
                    if (week.status=="published") {
                        guard.withLock {
                            ensureGeneration(generation)
                            dao.replaceWeek(WeekRecord(group,week.weekStart.toString(),week.weekEnd.toString(),week.branch!!,now.toEpochMilli(),url,week.warnings.joinToString("|"),week.lessons.size),
                                week.lessons.mapIndexed { n,l -> l.record(week.weekStart.toString(),n) })
                        }
                        verified.add(week.weekStart.toString())
                    } else if (issue==null) issue="SOURCE_"+week.status.uppercase()
                } catch (e: CancellationException) { throw e }
                catch (e: Exception) { if(issue==null) issue=(e as? ScheduleException)?.code ?: "HTML_PARSE_ERROR" }
            }
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { issue=(e as? ScheduleException)?.code ?: "STORAGE_OR_SOURCE_ERROR" }
        guard.withLock {
            ensureGeneration(generation)
            dao.putSync(SyncRecord(group,now.toEpochMilli(),issue,verified.joinToString("|"))); changed()
        }
    }
    suspend fun snapshot(groupOverride: String? = null, now: Instant = clock()): Snapshot = withContext(Dispatchers.IO) {
        guard.withLock {
            val preferences=settings.read(); val group=groupOverride ?: preferences.group
            if (group==null) return@withLock Snapshot(preferences,null,emptyList(),Engine.state(null,emptyList(),emptySet(),now),null,emptySet())
            val today=Riga.today(now); val marker=dao.sync(group)
            var issue=marker?.issue
            val records=dao.weeks(group).filter { it.weekEnd>=today.toString() && it.weekStart<=Riga.weekStart(today).plusDays(14).toString() }
            val weeks=records.mapNotNull { r ->
                try {
                    val start=LocalDate.parse(r.weekStart); val end=LocalDate.parse(r.weekEnd)
                    require(start.dayOfWeek==DayOfWeek.MONDAY && end==start.plusDays(6) && r.branch in listOf("riga","cesis","liepaja","talsi"))
                    val lessons=dao.lessons(group,r.weekStart).map { it.lesson() }
                    require(lessons.isNotEmpty() && lessons.size==r.lessonCount && lessons.all { it.group==group && it.date>=start && it.date<=end && it.end>it.start && it.period>0 && it.subject.isNotEmpty() })
                    Week(group,r.branch,start,end,"published",mapOf("current" to r.source),lessons,r.warnings.split('|').filter { it.isNotEmpty() })
                } catch(e: CancellationException) { throw e }
                catch (_: Exception) { issue=issue ?: "CORRUPT_CACHE"; null }
            }
            val stale=issue!=null || records.any { now.toEpochMilli()-it.syncedAt !in 0 until 900_000 }
            val freshMarker=marker!=null && now.toEpochMilli()-marker.attemptedAt in 0 until 900_000
            val verified=if(freshMarker) marker.verifiedWeeks.split('|').filter { it.isNotEmpty() }.toSet() else emptySet()
            Snapshot(preferences,group,weeks,Engine.state(group,weeks,preferences.choices[group].orEmpty(),now,
                issue in listOf("NETWORK_ERROR","NETWORK_TIMEOUT"),stale,issue),records.maxOfOrNull { it.syncedAt }?.let(Instant::ofEpochMilli),verified)
        }
    }
}
private fun Lesson.record(week: String,n: Int)=LessonRecord(group,week,n,date.toString(),startTime.toString(),endTime.toString(),subject,room,period,sourceGroup,subgroup,category,type,elective,requiresSelection,provisional,individualSchedule,deliveryModeUnspecified,changed,source)
private fun LessonRecord.lesson()=Lesson(LocalDate.parse(date),LocalTime.parse(startTime),LocalTime.parse(endTime),subject,room,period,groupCode,sourceGroup,subgroup,category,type,elective,requiresSelection,provisional,individualSchedule,deliveryModeUnspecified,changed,source)
