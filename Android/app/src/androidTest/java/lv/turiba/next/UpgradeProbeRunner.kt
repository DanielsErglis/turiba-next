package lv.turiba.next

import android.Manifest
import android.app.Activity
import android.appwidget.*
import android.content.*
import android.os.Bundle
import androidx.test.runner.AndroidJUnitRunner
import kotlinx.coroutines.*
import lv.turiba.next.core.*
import lv.turiba.next.settings.Settings
import lv.turiba.next.source.TimetableSource
import lv.turiba.next.storage.Repository
import lv.turiba.next.widget.*
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

/** Explicit seed/verify runner for a disposable emulator. Signed locally with the same owner
 * certificate as both release APKs; this runner and its fixtures are test-APK-only. */
open class UpgradeProbeRunner: AndroidJUnitRunner() {
    private var mode=""
    override fun onCreate(arguments: Bundle?) { mode=arguments?.getString("mode").orEmpty();super.onCreate(arguments) }
    override fun newApplication(cl: ClassLoader,className: String,context: Context)=
        super.newApplication(cl,OfflineTestApplication::class.java.name,context)
    override fun onStart() {
        if(mode.isBlank()) { super.onStart();return }
        try {
            runBlocking { probe() }
            finish(Activity.RESULT_OK,Bundle().apply { putString("upgradeProbe","PASS $mode") })
        } catch(e: Exception) {
            finish(Activity.RESULT_CANCELED,Bundle().apply { putString("upgradeProbe","FAIL $mode: ${e.javaClass.simpleName}: ${e.message}") })
        }
    }
    private suspend fun probe() {
        check(mode in setOf("seed","verify"))
        val app=targetContext.applicationContext as NextApplication
        app.repository.onChanged=null
        val file=File(targetContext.filesDir,"upgrade-probe.json")
        val host=AppWidgetHost(targetContext,0x555047)
        fun fingerprint(): String=runBlocking {
            val weeks=app.repository.db.schedule().weeks("TVL2D1")
            val text=StringBuilder()
            for(w in weeks) text.append(w).append(app.repository.db.schedule().lessons("TVL2D1",w.weekStart).joinToString())
            MessageDigest.getInstance("SHA-256").digest(text.toString().toByteArray()).joinToString("") { "%02x".format(it) }
        }
        if(mode=="seed") {
            app.deleteData()
            fun raw(name: String)=context.assets.open("raw/$name").bufferedReader().use { it.readText() }
            val source=object: TimetableSource {
                override suspend fun catalog()=Parser.mergeCatalogs(listOf("home.html","college.html","masters.html","doctoral.html","branches.html").map { Parser.catalog(raw(it)) })
                override suspend fun html(url: String)=raw(if(url.endsWith("ned=1")) "tvl2d1-two.html" else "tvl2d1-next.html")
            }
            val fake=Repository(app.repository.db,app.repository.settings,source,app.scope)
            fake.synchronize("TVL2D1",true)
            check(fake.snapshot("TVL2D1").weeks.size==2)
            val choice=fake.snapshot("TVL2D1").weeks.flatMap { it.lessons }.first { it.requiresSelection }.choiceKey
            app.repository.settings.save(Settings(group="TVL2D1",language="ru",theme="dark",choices=mapOf("TVL2D1" to setOf(choice))))
            uiAutomation.adoptShellPermissionIdentity(Manifest.permission.BIND_APPWIDGET)
            try {
                val first=host.allocateAppWidgetId();val second=host.allocateAppWidgetId();val manager=AppWidgetManager.getInstance(targetContext)
                check(manager.bindAppWidgetIdIfAllowed(first,ComponentName(targetContext,SquareReceiver::class.java)))
                check(manager.bindAppWidgetIdIfAllowed(second,ComponentName(targetContext,RectangleReceiver::class.java)))
                app.repository.setWidget(first,"TVL2D1");app.repository.setWidget(second,"CSA1D1")
                file.writeText(JSONObject().put("first",first).put("second",second).put("choice",choice).put("cache",fingerprint()).toString())
            } finally { uiAutomation.dropShellPermissionIdentity() }
        } else {
            val original=JSONObject(file.readText());val settings=app.repository.settings.read()
            check(settings.group=="TVL2D1" && settings.language=="ru" && settings.theme=="dark" && !settings.reminders)
            check(settings.choices["TVL2D1"]==setOf(original.getString("choice")))
            check(fingerprint()==original.getString("cache"))
            val first=original.getInt("first");val second=original.getInt("second")
            check(app.repository.snapshot(widgetId=first).group=="TVL2D1")
            check(app.repository.snapshot(widgetId=second).group=="CSA1D1")
            val manager=AppWidgetManager.getInstance(targetContext)
            check(manager.getAppWidgetInfo(first)!=null && manager.getAppWidgetInfo(second)!=null)
            check(targetContext.packageManager.getPackageInfo(targetContext.packageName,0).longVersionCode==2L)
            file.delete();app.deleteData()
            check(app.repository.widgets().isEmpty() && app.repository.settings.read().group==null)
            host.deleteAppWidgetId(first);host.deleteAppWidgetId(second);host.deleteHost()
        }
    }
}
