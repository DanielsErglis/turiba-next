package lv.turiba.next

import android.content.Context
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.*
import lv.turiba.next.core.*
import lv.turiba.next.settings.*
import lv.turiba.next.source.TimetableSource
import lv.turiba.next.storage.*
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class StorageTest {
    private lateinit var db: ScheduleDatabase
    private lateinit var scope: CoroutineScope
    private lateinit var repository: Repository
    private lateinit var preferences: SettingsStore
    private val testContext get()=InstrumentationRegistry.getInstrumentation().context
    private val context get()=InstrumentationRegistry.getInstrumentation().targetContext
    private fun fixture(name: String)=testContext.assets.open("raw/$name").bufferedReader().use { it.readText() }
    private var fail: String?=null
    private var block: CompletableDeferred<Unit>?=null
    private var entered: CompletableDeferred<Unit>?=null
    private var calls=0
    private val source=object: TimetableSource {
        override suspend fun catalog()=Parser.mergeCatalogs(listOf("home.html","college.html","masters.html","doctoral.html","branches.html").map { Parser.catalog(fixture(it)) })
        override suspend fun html(url: String): String {
            calls++; entered?.complete(Unit); block?.await()
            fail?.let { if(it=="NETWORK_ERROR") throw ScheduleException(it) }
            val name=if(url.endsWith("ned=1")) "tvl2d1-two.html" else "tvl2d1-next.html"
            val html=fixture(name)
            return when(fail) {
                "malformed"->html.dropLast(100)
                // Synthetic publication marker using the exact captured source message.
                "unpublished"->html.replace(Regex("(<tbody class=\"content2\">)[\\s\\S]*?(</tbody>)"),"$1<tr><td class=\"nav_public\">Atvainojiet, nodarbību saraksts šajā nedēļā nav publicēts</td></tr>$2")
                else->html
            }
        }
    }
    @Before fun setUp()= runBlocking {
        db=Room.inMemoryDatabaseBuilder(context,ScheduleDatabase::class.java).build()
        scope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
        preferences=SettingsStore(context)
        preferences.clear()
        repository=Repository(db,preferences,source,scope) { Instant.parse("2026-11-04T08:00:00Z") }
    }
    @After fun tearDown()=runBlocking { scope.cancel(); preferences.clear(); db.close() }
    @Test fun defaultsAreOffAndLocalAppearanceNeverFetches()=runBlocking {
        assertFalse(preferences.read().reminders)
        assertEquals("setupRequired",repository.snapshot().state.status)
        repository.edit { it.copy(theme="dark",language="lv") }
        assertEquals("dark",repository.snapshot().settings.theme)
        assertEquals(0,calls)
    }
    @Test fun roomKeepsLastPublishedBytesOnNetworkAndParseFailures()=runBlocking {
        repository.synchronize("TVL2D1",true)
        val original=db.schedule().weeks("TVL2D1")
        assertEquals(2,original.size)
        val originalLessons=db.schedule().lessons("TVL2D1","2026-11-02")
        assertTrue(originalLessons.isNotEmpty())
        fail="NETWORK_ERROR"; repository.synchronize("TVL2D1",true)
        assertEquals(original,db.schedule().weeks("TVL2D1"))
        assertEquals(originalLessons,db.schedule().lessons("TVL2D1","2026-11-02"))
        assertTrue(repository.snapshot("TVL2D1").state.offline)
        fail="malformed"; repository.synchronize("TVL2D1",true)
        assertEquals(original,db.schedule().weeks("TVL2D1"))
        assertEquals("HTML_PARSE_ERROR",repository.snapshot("TVL2D1").state.issue)
        assertTrue(repository.snapshot("TVL2D1").verifiedWeeks.isEmpty())
        fail="unpublished";repository.synchronize("TVL2D1",true)
        assertEquals(original,db.schedule().weeks("TVL2D1"))
        assertEquals("SOURCE_UNPUBLISHED",repository.snapshot("TVL2D1").state.issue)
    }
    @Test fun concurrentGroupSyncCoalescesAndUnknownGroupDoesNotFetchSchedule()=runBlocking {
        entered=CompletableDeferred(); block=CompletableDeferred()
        val first=async { repository.synchronize("TVL2D1",true) }
        entered!!.await()
        val second=async { repository.synchronize("TVL2D1",true) }
        delay(100); block!!.complete(Unit)
        first.await(); second.await()
        assertEquals(2,calls)
        repository.synchronize("NONEXISTENTPHASE0",true)
        assertEquals(2,calls)
        assertEquals("UNKNOWN_GROUP",repository.snapshot("NONEXISTENTPHASE0").state.issue)
    }
    @Test fun deletingDuringNetworkCannotResurrectSchedulesOrSettings()=runBlocking {
        repository.edit { it.copy(group="TVL2D1",reminders=true,choices=mapOf("TVL2D1" to setOf("chosen"))) }
        entered=CompletableDeferred(); block=CompletableDeferred()
        val flight=async { repository.synchronize("TVL2D1",true) }
        entered!!.await()
        repository.deleteData { }
        block!!.complete(Unit)
        try { flight.await(); fail("Expected cancellation") } catch (_: CancellationException) { }
        assertNull(preferences.read().group); assertFalse(preferences.read().reminders)
        assertTrue(preferences.read().choices.isEmpty())
        assertTrue(db.schedule().weeks("TVL2D1").isEmpty())
        assertTrue(db.schedule().catalog().isEmpty())
        assertEquals("setupRequired",repository.snapshot().state.status)
    }
    @Test fun incompleteCacheIsRejectedInsteadOfInventingLessons()=runBlocking {
        repository.synchronize("TVL2D1",true)
        db.schedule().removeLessons("TVL2D1","2026-11-02")
        val snapshot=repository.snapshot("TVL2D1")
        assertEquals("CORRUPT_CACHE",snapshot.state.issue)
        assertTrue(snapshot.state.coverageIncomplete)
    }
    @Test fun widgetGroupsStayIndependentAndDeletionCannotFallBackToPrimaryGroup()=runBlocking {
        repository.edit { it.copy(group="TVL2D1") }
        repository.setWidget(41,"CSA1D1");repository.setWidget(42,"BLL2S1")
        assertEquals("CSA1D1",repository.snapshot(widgetId=41).group)
        assertEquals("BLL2S1",repository.snapshot(widgetId=42).group)
        assertEquals("TVL2D1",repository.snapshot().group)
        repository.removeWidget(41)
        assertNull(repository.snapshot(widgetId=41).group)
        assertEquals("setupRequired",repository.snapshot(widgetId=41).state.status)
        repository.deleteData { }
        repository.synchronizeVisible(widgetId=42,true)
        assertNull(repository.snapshot(widgetId=42).group)
        assertTrue(repository.widgets().isEmpty())
        assertEquals(0,calls)
    }
    @Test fun manualRefreshJoiningAThrottledFlightStillFetches()=runBlocking {
        repository.synchronize("TVL2D1",true)
        val before=calls
        val dispatcher=java.util.concurrent.Executors.newSingleThreadExecutor().asCoroutineDispatcher()
        val pausedScope=CoroutineScope(SupervisorJob()+dispatcher)
        val released=java.util.concurrent.CountDownLatch(1)
        val started=java.util.concurrent.CountDownLatch(1)
        try {
            pausedScope.launch { started.countDown();check(released.await(5,java.util.concurrent.TimeUnit.SECONDS)) }
            assertTrue(started.await(5,java.util.concurrent.TimeUnit.SECONDS))
            val paused=Repository(db,preferences,source,pausedScope) { Instant.parse("2026-11-04T08:00:00Z") }
            val automatic=async { paused.synchronize("TVL2D1",false) }
            delay(100)
            val manual=async { paused.synchronize("TVL2D1",true) }
            delay(100);released.countDown()
            automatic.await();manual.await()
            assertEquals(before+2,calls)
        } finally { released.countDown();pausedScope.coroutineContext[Job]!!.cancelAndJoin();dispatcher.close() }
    }
    @Test fun confirmedDeletionFinishesWhenItsUiCallerIsCancelled()=runBlocking {
        repository.edit { it.copy(group="TVL2D1",reminders=true) }
        val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
        val deletion=launch { repository.deleteData { entered.complete(Unit);release.await() } }
        entered.await();deletion.cancel();release.complete(Unit);deletion.join()
        assertNull(preferences.read().group);assertFalse(preferences.read().reminders)
        assertTrue(repository.widgets().isEmpty())
        assertEquals(1L,db.schedule().generation()!!.value)
    }
}
