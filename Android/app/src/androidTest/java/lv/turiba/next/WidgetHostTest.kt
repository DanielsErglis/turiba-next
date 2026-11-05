package lv.turiba.next

import android.Manifest
import android.app.Activity
import android.appwidget.*
import android.content.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.core.app.ActivityScenario
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.*
import lv.turiba.next.widget.*
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith

/** Actual registered providers, framework host binding and configuration Activity; no source fetch is required. */
@RunWith(AndroidJUnit4::class)
class WidgetHostTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    private val app get()=context.applicationContext as NextApplication
    private lateinit var host: AppWidgetHost
    private val ids=mutableListOf<Int>()
    private var previous: (suspend ()->Unit)?=null
    @Before fun prepare()=runBlocking {
        previous=app.repository.onChanged;app.repository.onChanged=null
        app.deleteData();app.runtimeIssue.value=null
        instrumentation.uiAutomation.adoptShellPermissionIdentity(Manifest.permission.BIND_APPWIDGET)
        instrumentation.runOnMainSync { host=AppWidgetHost(context,0x544e);host.startListening() }
    }
    @After fun clean()=runBlocking {
        ids.forEach { host.deleteAppWidgetId(it) };ids.clear()
        host.stopListening();host.deleteHost()
        delay(300);app.deleteData();app.repository.onChanged=previous
        instrumentation.uiAutomation.dropShellPermissionIdentity()
    }
    private fun bind(receiver: Class<*>): Int {
        val id=host.allocateAppWidgetId();ids.add(id)
        assertTrue("Framework host must bind our registered provider",AppWidgetManager.getInstance(context).bindAppWidgetIdIfAllowed(id,ComponentName(context,receiver)))
        return id
    }
    @Test fun registeredProvidersAndHostOptionsAllowTwoRowFootprints() {
        for(receiver in listOf(SquareReceiver::class.java,RectangleReceiver::class.java)) {
            val id=bind(receiver);val manager=AppWidgetManager.getInstance(context)
            val info=manager.getAppWidgetInfo(id)!!;val density=context.resources.displayMetrics.density
            assertTrue("Legacy height forces excess launcher rows: ${info.minHeight/density}dp",info.minHeight/density<=111)
            assertTrue(info.minResizeHeight>0)
            if(android.os.Build.VERSION.SDK_INT>=31) { assertEquals(2,info.targetCellHeight);assertEquals(if(receiver==SquareReceiver::class.java) 2 else 4,info.targetCellWidth) }
            assertTrue("Picker needs a preview",info.previewImage!=0 || android.os.Build.VERSION.SDK_INT>=31 && info.previewLayout!=0)
            instrumentation.runOnMainSync {
                val view=host.createView(context,id,info)
                val width=if(receiver==SquareReceiver::class.java) 130 else 276
                view.updateAppWidgetSize(null,width,130,width,130)
            }
            assertTrue(manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)<=130)
        }
    }
    @Test fun addingAfterOnboardingCompletesWithoutRetypingGroup()=runBlocking {
        app.repository.edit { it.copy(group="TVL2D1",language="ru",choices=mapOf("TVL2D1" to setOf("explicit-choice"))) }
        val id=bind(SquareReceiver::class.java)
        ActivityScenario.launchActivityForResult<WidgetConfigurationActivity>(configurationIntent(id)).use { scenario ->
            withTimeout(10_000) { while(scenario.state!=Lifecycle.State.DESTROYED) delay(50) }
            assertEquals("New widget should reuse configured primary without text input","TVL2D1",app.repository.snapshot(widgetId=id).group)
            assertEquals(setOf("explicit-choice"),app.repository.settings.read().choices["TVL2D1"])
            assertEquals(Activity.RESULT_OK,scenario.result.resultCode)
            assertEquals(id,scenario.result.resultData!!.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1))
        }
    }
    private fun configurationIntent(id: Int)=Intent(context,WidgetConfigurationActivity::class.java)
        .setAction(AppWidgetManager.ACTION_APPWIDGET_CONFIGURE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
    @Test fun noPrimaryAndReconfigurationRetainDraftAcrossRealActivityRecreationAndCancel()=runBlocking {
        val id=bind(SquareReceiver::class.java)
        for(existing in listOf<String?>(null,"CSA1D1")) {
            existing?.let { app.repository.setWidget(id,it) }
            ActivityScenario.launch<WidgetConfigurationActivity>(configurationIntent(id)).use { scenario ->
                lateinit var model: WidgetConfigurationModel
                scenario.onActivity { model=ViewModelProvider(it)[WidgetConfigurationModel::class.java] }
                withTimeout(5000) { while(model.state.value.busy) delay(50) }
                assertFalse(model.state.value.complete);assertEquals(existing ?: "",model.state.value.input)
                scenario.onActivity { model.input("BLL2S1") }
                scenario.recreate()
                scenario.onActivity { assertSame(model,ViewModelProvider(it)[WidgetConfigurationModel::class.java]);assertEquals("BLL2S1",model.state.value.input) }
            }
            assertEquals(existing,app.repository.snapshot(widgetId=id).group)
        }
    }
    @Test fun restoreReceiverDispatchTransfersGroupsAndCannotReviveDeletedData()=runBlocking {
        val first=bind(SquareReceiver::class.java);val second=bind(SquareReceiver::class.java)
        app.repository.setWidget(900001,"TVL2D1");app.repository.setWidget(900002,"CSA1D1")
        // RESTORED is a protected system broadcast. Invoke its receiver callback with real bound
        // IDs; do not claim the instrumentation UID can originate a protected OS event.
        fun broadcast()=instrumentation.runOnMainSync { SquareReceiver().onReceive(context,Intent(AppWidgetManager.ACTION_APPWIDGET_RESTORED)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_OLD_IDS,intArrayOf(900001,900002)).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,intArrayOf(first,second))) }
        broadcast()
        withTimeout(5000) { while(app.repository.snapshot(widgetId=second).group!="CSA1D1") delay(50) }
        assertEquals("TVL2D1",app.repository.snapshot(widgetId=first).group)
        withTimeout(5000) { while(!AppWidgetManager.getInstance(context).getAppWidgetOptions(second).getBoolean(AppWidgetManager.OPTION_APPWIDGET_RESTORE_COMPLETED)) delay(50) }
        assertNull(app.runtimeIssue.value)
        app.deleteData();broadcast();delay(500)
        assertNull(app.repository.snapshot(widgetId=first).group);assertNull(app.repository.snapshot(widgetId=second).group)
        assertNull(app.runtimeIssue.value)
    }
    @Test fun frameworkDeletionHasOneAsyncOwnerAndCleansMapping()=runBlocking {
        val id=bind(RectangleReceiver::class.java);app.repository.setWidget(id,"TVL2D1")
        app.runtimeIssue.value=null;host.deleteAppWidgetId(id);ids.remove(id)
        repeat(50) { if(app.repository.snapshot(widgetId=id).group==null) return@repeat;delay(100) }
        assertNull(app.repository.snapshot(widgetId=id).group);delay(300)
        assertNull("Deleting through the framework must not cause a receiver completion error",app.runtimeIssue.value)
    }
}
