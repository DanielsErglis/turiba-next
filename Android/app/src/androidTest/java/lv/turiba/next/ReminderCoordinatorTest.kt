package lv.turiba.next

import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.*
import lv.turiba.next.core.*
import lv.turiba.next.reminders.*
import lv.turiba.next.settings.SettingsStore
import lv.turiba.next.source.TimetableSource
import lv.turiba.next.storage.*
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.time.Instant
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

@RunWith(AndroidJUnit4::class)
class ReminderCoordinatorTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    private lateinit var db: ScheduleDatabase
    private lateinit var scope: CoroutineScope
    private lateinit var repository: Repository
    private lateinit var preferences: SettingsStore
    private lateinit var coordinator: ReminderCoordinator
    private var now=Instant.parse("2026-10-26T05:00:00Z")
    private val platform=object: ReminderPlatform {
        var allowed=true
        val calls=AtomicInteger()
        val scheduled=mutableListOf<String>()
        val active=java.util.concurrent.ConcurrentHashMap.newKeySet<String>()
        val posted=AtomicInteger()
        var entered: CountDownLatch?=null
        var release: CountDownLatch?=null
        override fun permitted(): Boolean { calls.incrementAndGet();return allowed }
        override fun schedule(record: ReminderRecord) { calls.incrementAndGet();scheduled.add(record.id) }
        override fun cancel(record: ReminderRecord) { calls.incrementAndGet();active.remove(record.id) }
        override fun cancelOwnedActive() { calls.incrementAndGet();active.removeIf { it.startsWith(Reminders.PREFIX) } }
        override fun post(record: ReminderRecord): Boolean {
            calls.incrementAndGet();active.add(record.id);posted.incrementAndGet()
            entered?.countDown();release?.let { check(it.await(5,TimeUnit.SECONDS)) }
            return true
        }
    }
    private fun fixture(name: String)=instrumentation.context.assets.open("raw/$name").bufferedReader().use { it.readText() }
    @Before fun setUp()=runBlocking {
        db=Room.inMemoryDatabaseBuilder(context,ScheduleDatabase::class.java).build()
        preferences=SettingsStore(context);preferences.clear()
        scope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
        val source=object: TimetableSource {
            override suspend fun catalog()=Parser.mergeCatalogs(listOf("home.html","college.html","masters.html","doctoral.html","branches.html").map { Parser.catalog(fixture(it)) })
            override suspend fun html(url: String)=fixture(if(url.endsWith("ned=1")) "tvl2d1-next.html" else "tvl2d1-current.html")
        }
        repository=Repository(db,preferences,source,scope) { now }
        coordinator=ReminderCoordinator(repository,platform) { "en" to "Room not provided" }
    }
    @After fun tearDown()=runBlocking { scope.coroutineContext[kotlinx.coroutines.Job]!!.cancelAndJoin();preferences.clear();db.close() }
    private suspend fun enable() {
        repository.synchronize("TVL2D1",true)
        repository.edit { it.copy(group="TVL2D1",reminders=true) }
        coordinator.reconcile()
    }
    @Test fun defaultOffDoesNotInspectPermissionRegistryOrSchedule()=runBlocking {
        coordinator.reconcile(forceReschedule=true)
        coordinator.deliver(Reminders.PREFIX+"anything")
        assertEquals(0,platform.calls.get())
        assertTrue(db.schedule().reminders().isEmpty())
    }
    @Test fun confirmedMainGroupPlansAreIdempotentAndCanBeRearmedAfterReboot()=runBlocking {
        enable()
        val original=db.schedule().reminders()
        assertTrue(original.isNotEmpty())
        assertTrue(original.all { it.groupCode=="TVL2D1" })
        repository.setWidget(91,"CSA1D1")
        val count=platform.scheduled.size
        coordinator.reconcile();assertEquals(count,platform.scheduled.size)
        coordinator.reconcile(forceReschedule=true)
        assertEquals(count*2,platform.scheduled.size)
        assertEquals(original,db.schedule().reminders())
    }
    @Test fun denialDisablesRemindersWithoutBreakingSchedule()=runBlocking {
        enable();platform.allowed=false
        coordinator.reconcile()
        assertFalse(preferences.read().reminders)
        assertTrue(db.schedule().reminders().isEmpty())
        assertTrue(repository.snapshot().weeks.isNotEmpty())
    }
    @Test fun selectionAndMainGroupChangesCancelObsoleteOwnedPlansOnly()=runBlocking {
        enable()
        val allChoices=repository.snapshot().weeks.flatMap { it.lessons }.filter { it.requiresSelection }.map { it.choiceKey }.toSet()
        repository.edit { it.copy(choices=mapOf("TVL2D1" to allChoices)) };coordinator.reconcile()
        val selectedCount=db.schedule().reminders().size
        repository.edit { it.copy(choices=emptyMap()) };coordinator.reconcile()
        assertTrue(db.schedule().reminders().size<selectedCount)
        val foreign=ReminderRecord("another-app", "someone-else","foreign","TVL2D1","2026-10-26",now.toEpochMilli(),"x","x",0)
        db.schedule().putReminder(foreign)
        repository.edit { it.copy(group="CSA1D1") };coordinator.reconcile()
        assertEquals(listOf(foreign),db.schedule().reminders())
    }
    @Test fun deliveryIsDeduplicatedAndLateOrOffDeliveryIsSuppressed()=runBlocking {
        enable()
        val first=db.schedule().reminders().minBy { it.triggerAt }
        assertEquals(first.groupCode,preferences.read().group)
        assertEquals(first.generation,db.schedule().generation()?.value ?: 0L)
        now=Instant.ofEpochMilli(first.triggerAt)
        assertEquals(DeliveryResult.POSTED,coordinator.deliver(first.id));assertEquals(DeliveryResult.DUPLICATE,coordinator.deliver(first.id))
        assertEquals(1,platform.posted.get())
        val next=db.schedule().reminders().filter { !it.delivered }.minBy { it.triggerAt }
        now=Instant.ofEpochMilli(next.triggerAt).plusSeconds(11*60)
        coordinator.deliver(next.id);assertEquals(1,platform.posted.get())
        repository.edit { it.copy(reminders=false) }
        val before=platform.calls.get();coordinator.deliver(next.id)
        assertEquals(before,platform.calls.get())
    }
    @Test fun deletionSerializedWithDeliveryLeavesNoVisibleOwnedNotification()=runBlocking {
        enable()
        val record=db.schedule().reminders().minBy { it.triggerAt }
        now=Instant.ofEpochMilli(record.triggerAt)
        platform.entered=CountDownLatch(1);platform.release=CountDownLatch(1)
        val delivery=async(Dispatchers.Default) { coordinator.deliver(record.id) }
        assertTrue(platform.entered!!.await(5,TimeUnit.SECONDS))
        val deletion=async(Dispatchers.Default) { repository.deleteData { coordinator.cancelOwnedWhileLocked() } }
        delay(100);assertFalse(deletion.isCompleted)
        platform.release!!.countDown();delivery.await();deletion.await()
        assertTrue(platform.active.isEmpty());assertTrue(db.schedule().reminders().isEmpty())
        assertFalse(preferences.read().reminders);assertNull(preferences.read().group)
    }
}
