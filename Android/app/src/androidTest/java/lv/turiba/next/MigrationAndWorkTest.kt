package lv.turiba.next

import androidx.room.Room
import androidx.room.testing.MigrationTestHelper
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.*
import kotlinx.coroutines.*
import lv.turiba.next.background.*
import lv.turiba.next.reminders.*
import lv.turiba.next.settings.*
import lv.turiba.next.storage.*
import lv.turiba.next.source.TimetableSource
import lv.turiba.next.core.*
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class MigrationAndWorkTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    @get:Rule val helper=MigrationTestHelper(InstrumentationRegistry.getInstrumentation(),ScheduleDatabase::class.java)
    @Test fun migrationKeepsCatalogWidgetGenerationAndPreferences()=runBlocking {
        val preferences=SettingsStore(context)
        val original=Settings(group="TVL2D1",language="ru",theme="dark",leadMinutes=15,choices=mapOf("TVL2D1" to setOf("chosen")))
        preferences.save(original)
        try {
            helper.createDatabase("migration-only-test",1).apply {
                execSQL("INSERT INTO GroupRecord VALUES ('TVL2D1','riga','https://nodarbibas.turiba.lv/pub_nod.asp?Grupa=TVL2D1',1)")
                execSQL("INSERT INTO WidgetRecord VALUES (7,'CSA1D1')")
                execSQL("INSERT INTO Generation VALUES (1,42)")
                close()
            }
            helper.runMigrationsAndValidate("migration-only-test",2,true,MIGRATION_1_2).apply {
                query("SELECT groupCode FROM WidgetRecord WHERE appWidgetId=7").use { assertTrue(it.moveToFirst());assertEquals("CSA1D1",it.getString(0)) }
                query("SELECT value FROM Generation WHERE id=1").use { assertTrue(it.moveToFirst());assertEquals(42,it.getInt(0)) }
                query("SELECT code FROM GroupRecord").use { assertTrue(it.moveToFirst());assertEquals("TVL2D1",it.getString(0)) }
                close()
            }
            assertEquals(original,preferences.read())
        } finally { preferences.clear();context.deleteDatabase("migration-only-test") }
    }
    @Test fun deletionCancelsOnlyTaggedProjectWork()=runBlocking {
        val preferences=SettingsStore(context);preferences.clear()
        val db=Room.inMemoryDatabaseBuilder(context,ScheduleDatabase::class.java).build()
        val scope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
        val source=object: TimetableSource {
            override suspend fun catalog(): List<CatalogEntry> = error("No network expected")
            override suspend fun html(url: String): String = error("No network expected")
        }
        val repository=Repository(db,preferences,source,scope)
        val platform=object: ReminderPlatform {
            override fun permitted()=error("OFF must not inspect permissions")
            override fun schedule(record: ReminderRecord)=error("OFF must not schedule")
            override fun cancel(record: ReminderRecord) { }
            override fun cancelOwnedActive() { }
            override fun post(record: ReminderRecord)=false
        }
        val reminders=ReminderCoordinator(repository,platform) { "en" to "Room not provided" }
        val background=Background(context,repository) { reminders }
        val work=WorkManager.getInstance(context)
        val owned=OneTimeWorkRequestBuilder<BoundaryWorker>().setInitialDelay(1,TimeUnit.DAYS).addTag(Background.BOUNDARY).build()
        val unrelated=OneTimeWorkRequestBuilder<BoundaryWorker>().setInitialDelay(1,TimeUnit.DAYS).addTag("unrelated-test-only").build()
        try {
            withContext(Dispatchers.IO) { work.enqueue(listOf(owned,unrelated)).result.get(10,TimeUnit.SECONDS) }
            repository.deleteData { background.cancelOwnedWhileLocked();reminders.cancelOwnedWhileLocked() }
            withContext(Dispatchers.IO) {
                assertEquals(WorkInfo.State.CANCELLED,work.getWorkInfoById(owned.id).get(10,TimeUnit.SECONDS)!!.state)
                assertEquals(WorkInfo.State.ENQUEUED,work.getWorkInfoById(unrelated.id).get(10,TimeUnit.SECONDS)!!.state)
            }
        } finally {
            withContext(Dispatchers.IO) { work.cancelWorkById(unrelated.id).result.get(10,TimeUnit.SECONDS) }
            scope.coroutineContext[Job]!!.cancelAndJoin();preferences.clear();db.close()
        }
    }
}
