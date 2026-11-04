package lv.turiba.next

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.appwidget.*
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import lv.turiba.next.core.*
import lv.turiba.next.settings.Settings
import lv.turiba.next.storage.Snapshot
import lv.turiba.next.widget.WidgetBody
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.time.*
import java.util.Locale
import java.io.File

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalGlanceRemoteViewsApi::class)
class WidgetRenderTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    private val now=Instant.parse("2026-11-04T08:30:00Z")
    private fun snapshot(language: String,theme: String,status: String="ongoing",warnings: Boolean=false): Snapshot {
        // Explicitly synthetic UI data, not a captured schedule or publication claim.
        val lesson=Lesson(LocalDate.parse("2026-11-04"),LocalTime.parse("10:00"),LocalTime.parse("11:30"),
            "Integrētā mārketinga komunikācija", "C216",1,"TVL2D1","TVL2D1",null,"Synthetic UI","lesson",false,false,false,false,false,false,Parser.ORIGIN)
        val next=lesson.copy(startTime=LocalTime.parse("12:55"),endTime=LocalTime.parse("14:25"),subject="Uzņēmējdarbības vadība")
        val settings=Settings(group="TVL2D1",language=language,theme=theme)
        val state=ScheduleState(status,if(status in listOf("ongoing","soon","upcoming")) lesson else null,next,
            offline=status=="error" || warnings,stale=status=="error" || warnings,selectionRequired=status=="error" || warnings,coverageIncomplete=status=="error" || warnings,refreshAt=now.plusSeconds(600))
        return Snapshot(settings,"TVL2D1",emptyList(),state,now,emptySet(),now)
    }
    private class RenderWidget(val localized: Context,val snapshot: Snapshot,val rectangle: Boolean): GlanceAppWidget() {
        override val sizeMode=SizeMode.Exact
        override suspend fun provideGlance(context: Context,id: GlanceId) {
            provideContent { WidgetBody(localized,42,snapshot,rectangle) }
        }
    }
    private fun textViews(view: View): List<TextView> = (if(view is TextView) listOf(view) else emptyList()) +
        if(view is ViewGroup) (0 until view.childCount).flatMap { textViews(view.getChildAt(it)) } else emptyList()

    @Test fun nativeRemoteViewsRenderLocalesThemesSizesAndAllStates()=runBlocking {
        var count=0
        for(rectangle in listOf(false,true)) for(language in listOf("en","lv","ru")) for(theme in listOf("system","light","dark")) for(large in listOf(false,true)) {
            render(rectangle,language,theme,large,"ongoing",save=language=="en" && theme=="dark")
            count++
        }
        for(status in listOf("upcoming","soon","finished","noSchedule","setupRequired","error")) {
            render(true,"ru","dark",false,status,save=status=="error"); count++
        }
        for(rectangle in listOf(false,true)) for(scale in listOf(1.3f,2f)) for(warnings in listOf(false,true)) {
            render(rectangle,"ru","dark",false,"ongoing",save=true,fontScale=scale,warnings=warnings);count++
        }
        assertEquals(50,count)
    }
    private suspend fun render(rectangle: Boolean,language: String,theme: String,large: Boolean,status: String,save: Boolean,fontScale: Float=1f,warnings: Boolean=false) {
        val configuration=Configuration(context.resources.configuration)
        configuration.setLocale(Locale.forLanguageTag(language))
        configuration.fontScale=fontScale
        if(theme=="system" && large) configuration.uiMode=(configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or Configuration.UI_MODE_NIGHT_YES
        val localized=context.createConfigurationContext(configuration)
        val width=if(rectangle) if(large) 360 else 280 else if(large) 250 else 150
        val height=if(large) if(rectangle) 180 else 250 else 150
        val remote=RenderWidget(localized,snapshot(language,theme,status,warnings),rectangle).compose(localized,size=DpSize(width.dp,height.dp))
        instrumentation.runOnMainSync {
            val parent=FrameLayout(localized)
            val view=remote.apply(localized,parent)
            parent.addView(view)
            val density=localized.resources.displayMetrics.density
            val w=(width*density).toInt();val h=(height*density).toInt()
            parent.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY))
            parent.layout(0,0,w,h)
            val texts=textViews(parent)
            if(save || !rectangle && !large && language=="en" && theme=="system") {
                val bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888)
                parent.draw(Canvas(bitmap))
                val dir=File(context.filesDir,"widget-checks").also { check(it.mkdirs() || it.isDirectory) }
                File(dir,"${if(rectangle) "rectangle" else "square"}-$language-$theme-$width-$status-f$fontScale-w$warnings.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG,100,it) }
                bitmap.recycle()
            }
            assertTrue("No native text for $rectangle/$language/$theme/$status",texts.isNotEmpty())
            assertFalse(texts.any { it.text.toString().contains("Error loading") })
            if(status=="ongoing") {
                val room=texts.firstOrNull { it.text.toString()=="C216" }
                assertNotNull("Room text missing",room)
                assertTrue("Room has no native height $rectangle/$language/$width",room!!.height>0)
                assertTrue("Room text clipped $rectangle/$language/$width: layout=${room.layout.height} view=${room.height} padding=${room.paddingTop+room.paddingBottom}; "+texts.joinToString { "${it.text}=${it.width}x${it.height}" },room.layout.height<=room.height-room.paddingTop-room.paddingBottom)
                assertTrue("Room ellipsis $rectangle/$language/$width",(0 until room.layout.lineCount).all { room.layout.getEllipsisCount(it)==0 })
            }
        }
    }
}
