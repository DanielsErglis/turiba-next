package lv.turiba.next.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import androidx.glance.semantics.semantics
import androidx.glance.semantics.contentDescription
import androidx.core.net.toUri
import kotlinx.coroutines.launch
import lv.turiba.next.*
import lv.turiba.next.R
import lv.turiba.next.storage.Snapshot
import java.util.Locale

object WidgetUpdates {
    suspend fun update(context: Context) {
        SquareWidget().updateAll(context); RectangleWidget().updateAll(context)
    }
}
class SquareWidget : ScheduleWidget(false)
class RectangleWidget : ScheduleWidget(true)
open class ScheduleWidget(private val rectangular: Boolean): GlanceAppWidget() {
    override val sizeMode: SizeMode = SizeMode.Responsive(if(rectangular) setOf(DpSize(280.dp,150.dp),DpSize(360.dp,180.dp),DpSize(450.dp,210.dp)) else setOf(DpSize(150.dp,150.dp),DpSize(190.dp,190.dp),DpSize(250.dp,250.dp)))
    override suspend fun provideGlance(context: Context,id: GlanceId) {
        val widgetId=GlanceAppWidgetManager(context).getAppWidgetId(id)
        val repository=(context.applicationContext as NextApplication).repository
        val initial=try { repository.snapshot(widgetId=widgetId) } catch(_: Exception) { null }
        provideContent {
            val revision by repository.revision.collectAsState()
            val snapshot by produceState(initialValue=initial,key1=revision) {
                value=try { repository.snapshot(widgetId=widgetId) } catch(e: kotlinx.coroutines.CancellationException) { throw e } catch(_: Exception) { null }
            }
            val config=Configuration(context.resources.configuration)
            snapshot?.settings?.language?.takeIf { it!="system" }?.let { config.setLocale(Locale.forLanguageTag(it)) }
            WidgetBody(context.createConfigurationContext(config),widgetId,snapshot,rectangular)
        }
    }
}

@Composable internal fun WidgetBody(context: Context,id: Int,snapshot: Snapshot?,rectangular: Boolean) {
    val size=LocalSize.current
    val compact=size.height<170.dp
    val fontScale=context.resources.configuration.fontScale
    val theme=snapshot?.settings?.theme ?: "system"
    fun color(light: Long,dark: Long): ColorProvider = when(theme) {
        "light"->ColorProvider(Color(light)); "dark"->ColorProvider(Color(dark)); else->androidx.glance.color.ColorProvider(day=Color(light),night=Color(dark))
    }
    val background=color(0xffedf6ff,0xff071a2c); val foreground=color(0xff102b45,0xffeef6ff)
    val accent=color(0xff006398,0xff7cd5ff); val roomColor=color(0xffcde9ff,0xff183d5c)
    fun launch(refresh: Boolean=false)=actionStartActivity(Intent(context,MainActivity::class.java)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id).putExtra("refresh",refresh)
        .setData("turibanext://widget/$id/${if(refresh) "refresh" else "open"}".toUri()))
    val state=snapshot?.state
    val current=state?.current
    fun textSize(value: Int)=(value / maxOf(1f,fontScale/(if(compact) 1.1f else 1.2f))).sp
    val status=context.getString(when(state?.status) {
        "ongoing"->R.string.ongoing; "soon"->R.string.soon; "upcoming"->R.string.upcoming
        "finished"->R.string.finished; "noSchedule"->R.string.no_schedule; "setupRequired"->R.string.setup
        else->R.string.source_error
    })
    val warnings=buildList {
        if(state?.offline==true) add(context.getString(R.string.widget_offline))
        if(state?.stale==true) add(context.getString(R.string.widget_stale))
        if(state?.selectionRequired==true) add(context.getString(R.string.widget_choices))
        if(state?.coverageIncomplete==true) add(context.getString(R.string.widget_coverage))
        if(state?.concurrent?.isNotEmpty()==true) add(context.getString(R.string.overlap)+" (${state.concurrent.size+1})")
    }
    val sideRoom=rectangular || compact && warnings.size>=2
    val tight=compact && warnings.size>=2
    val detail=if(current!=null) (if(current.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) current.date.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM"))+" " else "")+current.startTime+" · "+status else status
    Column(GlanceModifier.fillMaxSize().background(background).cornerRadius(22.dp).padding(if(compact) 10.dp else 14.dp).clickable(launch())) {
        Row(GlanceModifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
            Text((snapshot?.group ?: "TURĪBA NEXT")+"\n"+detail,GlanceModifier.defaultWeight(),style=TextStyle(color=accent,fontSize=textSize(if(compact) 10 else 11),fontWeight=FontWeight.Bold),maxLines=2)
            Text("↻",GlanceModifier.padding(start=12.dp,bottom=3.dp).semantics { contentDescription=context.getString(R.string.sync) }.clickable(launch(true)),style=TextStyle(color=accent,fontSize=textSize(if(compact) 18 else 22)))
        }
        Spacer(GlanceModifier.height(5.dp))
        Row(GlanceModifier.fillMaxWidth().defaultWeight(),verticalAlignment=Alignment.CenterVertically) {
            Column(GlanceModifier.defaultWeight()) {
                Text(current?.subject ?: "—",style=TextStyle(color=foreground,fontSize=textSize(if(tight) 16 else if(size.height>=210.dp) 26 else 20),fontWeight=FontWeight.Bold),maxLines=if(tight || compact && !rectangular || warnings.isNotEmpty() && size.height<210.dp) 1 else if(size.height>=210.dp) 3 else 2)
                if(rectangular && !tight || !rectangular && size.height>=210.dp) current?.let { Text((if(it.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) "${it.date} · " else "")+"${it.startTime}–${it.endTime}",style=TextStyle(color=accent,fontSize=textSize(12)),maxLines=2) }
                if(!sideRoom && current!=null) Text(current.room ?: context.getString(R.string.no_room),style=TextStyle(color=accent,fontSize=textSize(if(current.room==null) 12 else if(compact && fontScale>1.1f) 22 else if(compact) 24 else 26),fontWeight=FontWeight.Bold),maxLines=2)
            }
            if(sideRoom && current!=null) {
                Spacer(GlanceModifier.width(10.dp))
                Box(GlanceModifier.width(if(!rectangular) 52.dp else if(size.width>=350.dp) 100.dp else 82.dp).fillMaxHeight().background(roomColor).cornerRadius(14.dp).padding(if(tight) 4.dp else 8.dp),contentAlignment=Alignment.Center) {
                    Text(current.room ?: context.getString(R.string.no_room),style=TextStyle(color=foreground,fontSize=textSize(if(current.room==null) 12 else if(tight) 14 else if(size.width>=350.dp) 30 else 24),fontWeight=FontWeight.Bold,textAlign=TextAlign.Center),maxLines=3)
                }
            }
        }
        if(warnings.isNotEmpty()) Text(warnings.joinToString(" · "),style=TextStyle(color=accent,fontSize=textSize(10)),maxLines=if(size.height>=190.dp) 3 else 2)
        state?.next?.let { next ->
            Spacer(GlanceModifier.height(5.dp))
            Row(GlanceModifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                Text((if(next.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) "${next.date} · " else "")+next.subject,GlanceModifier.defaultWeight(),style=TextStyle(color=foreground,fontSize=textSize(11)),maxLines=if(tight || compact && fontScale>1.1f) 1 else 2)
                Text(next.startTime.toString(),GlanceModifier.padding(start=6.dp),style=TextStyle(color=accent,fontSize=textSize(17),fontWeight=FontWeight.Bold),maxLines=1)
            }
        }
    }
}
abstract class ScheduleReceiver: GlanceAppWidgetReceiver() {
    override fun onDeleted(context: Context,appWidgetIds: IntArray) {
        super.onDeleted(context,appWidgetIds)
        val pending=goAsync(); val app=context.applicationContext as NextApplication
        app.scope.launch { try { appWidgetIds.forEach { app.repository.removeWidget(it) } } finally { pending.finish() } }
    }
    override fun onRestored(context: Context,oldWidgetIds: IntArray,newWidgetIds: IntArray) {
        super.onRestored(context,oldWidgetIds,newWidgetIds)
        val pending=goAsync(); val app=context.applicationContext as NextApplication
        app.scope.launch { try {
            val mappings=app.repository.widgets().associateBy { it.appWidgetId }
            oldWidgetIds.zip(newWidgetIds).forEach { (old,new) -> mappings[old]?.let { app.repository.setWidget(new,it.groupCode); app.repository.removeWidget(old) } }
            WidgetUpdates.update(context)
        } finally { pending.finish() } }
    }
}
class SquareReceiver: ScheduleReceiver() { override val glanceAppWidget: GlanceAppWidget=SquareWidget() }
class RectangleReceiver: ScheduleReceiver() { override val glanceAppWidget: GlanceAppWidget=RectangleWidget() }
class WidgetConfigurationActivity: MainActivity()
