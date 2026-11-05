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
    override val sizeMode: SizeMode = SizeMode.Exact
    override suspend fun onDelete(context: Context,id: GlanceId) {
        // Glance already owns the broadcast PendingResult and awaits this suspend callback.
        val app=context.applicationContext as NextApplication
        app.repository.removeWidget(GlanceAppWidgetManager(context).getAppWidgetId(id))
        app.background.changed()
    }
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
    val host=LocalSize.current
    // Bound visible card proportions even when an OEM allocates unusually tall grid cells.
    // Provider metadata separately controls the occupied launcher span.
    val width=if(rectangular) host.width else minOf(host.width,host.height)
    val size=DpSize(width,minOf(host.height,if(rectangular) width/2f else width))
    val compact=size.height<170.dp
    val tiny=size.height<150.dp
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
    val roomLabel=current?.room ?: context.getString(R.string.widget_no_room)
    val longRoom=roomLabel.length>10
    fun textSize(value: Int)=(value / maxOf(1f,fontScale/(if(tiny) 1f else if(compact) 1.1f else 1.2f))).sp
    val status=context.getString(when(state?.status) {
        "ongoing"->R.string.ongoing; "soon"->R.string.soon; "upcoming"->R.string.upcoming
        "finished"->R.string.finished; "noSchedule"->R.string.no_schedule; "setupRequired"->R.string.setup
        else->R.string.source_error
    })
    val warnings=buildList {
        if(state?.offline==true) add(context.getString(if(tiny) R.string.widget_short_offline else R.string.widget_offline))
        if(state?.stale==true) add(context.getString(if(tiny) R.string.widget_short_stale else R.string.widget_stale))
        if(state?.selectionRequired==true) add(context.getString(if(tiny) R.string.widget_short_choices else R.string.widget_choices))
        if(state?.coverageIncomplete==true) add(context.getString(if(tiny) R.string.widget_short_coverage else R.string.widget_coverage))
        if(state?.concurrent?.isNotEmpty()==true) add(context.getString(R.string.overlap)+" (${state.concurrent.size+1})")
    }
    val sideRoom=rectangular || compact && warnings.size>=2
    val tight=compact && warnings.size>=2
    val detail=if(current!=null) (if(current.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) current.date.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM"))+" " else "")+current.startTime+" · "+status else status
    val shortStatus=context.getString(when(state?.status) {
        "ongoing"->R.string.widget_now;"soon"->R.string.widget_soon;"upcoming"->R.string.widget_later
        "finished"->R.string.widget_done;"noSchedule"->R.string.widget_empty;"setupRequired"->R.string.widget_set_group
        else->R.string.widget_check
    })
    val groupLabel=snapshot?.group ?: "TURĪBA NEXT"
    val header=if(tiny && current!=null) groupLabel+" · "+current.startTime+"\n"+
        (if(current.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) current.date.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM"))+" · " else "")+shortStatus
        else groupLabel+"\n"+if(tiny) shortStatus else detail
    Box(GlanceModifier.fillMaxSize(),contentAlignment=Alignment.TopCenter) {
    Column(GlanceModifier.width(size.width).height(size.height).background(background).cornerRadius(if(tiny) 14.dp else 22.dp).padding(if(tiny) 6.dp else if(compact) 8.dp else 14.dp).clickable(launch())) {
        Row(GlanceModifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
            Text(header,GlanceModifier.defaultWeight().semantics { contentDescription=groupLabel+" · "+detail },style=TextStyle(color=accent,fontSize=textSize(if(tiny) 9 else if(compact) 10 else 11),fontWeight=FontWeight.Bold),maxLines=2)
            Text("↻",GlanceModifier.padding(start=if(tiny) 4.dp else 12.dp,bottom=3.dp).semantics { contentDescription=context.getString(R.string.sync) }.clickable(launch(true)),style=TextStyle(color=accent,fontSize=textSize(if(tiny) 16 else if(compact) 18 else 22)))
        }
        Spacer(GlanceModifier.height(if(tiny) 3.dp else 5.dp))
        Row(GlanceModifier.fillMaxWidth().defaultWeight(),verticalAlignment=Alignment.CenterVertically) {
            Column(GlanceModifier.defaultWeight()) {
                Text(current?.subject ?: "—",style=TextStyle(color=foreground,fontSize=textSize(if(tiny) 14 else if(tight) 16 else if(compact && longRoom) 18 else if(size.height>=210.dp) 26 else 20),fontWeight=FontWeight.Bold),maxLines=if(tight || tiny || compact && !rectangular || warnings.isNotEmpty() && size.height<210.dp) 1 else if(size.height>=210.dp) 3 else 2)
                if(rectangular && !tight && !tiny || !rectangular && size.height>=210.dp) current?.let { Text((if(it.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) "${it.date} · " else "")+"${it.startTime}–${it.endTime}",style=TextStyle(color=accent,fontSize=textSize(12)),maxLines=2) }
                if(!sideRoom && current!=null) Text(roomLabel,style=TextStyle(color=accent,fontSize=textSize(if(tiny && longRoom) 10 else if(current.room==null || longRoom) 12 else if(tiny) 18 else if(compact && fontScale>1.1f) 22 else if(compact) 24 else 26),fontWeight=FontWeight.Bold),maxLines=2)
            }
            if(sideRoom && current!=null) {
                Spacer(GlanceModifier.width(if(tiny) 4.dp else 10.dp))
                Box(GlanceModifier.width(if(!rectangular && tiny) 50.dp else if(!rectangular) 52.dp else if(size.width>=350.dp) 100.dp else 82.dp).fillMaxHeight().background(roomColor).cornerRadius(14.dp).padding(if(tiny) 2.dp else if(tight || compact && longRoom) 4.dp else 8.dp),contentAlignment=Alignment.Center) {
                    val roomSize=when {
                        (current.room==null || longRoom) && tiny -> 9
                        current.room==null || longRoom -> 12
                        tight -> if(tiny) 12 else 14
                        roomLabel.length>6 -> if(compact) 13 else 18
                        roomLabel.length>4 -> if(compact) 18 else 22
                        size.width>=350.dp -> 30
                        else -> 24
                    }
                    Text(roomLabel,GlanceModifier.semantics { contentDescription=current.room ?: context.getString(R.string.no_room) },style=TextStyle(color=foreground,fontSize=textSize(roomSize),fontWeight=FontWeight.Bold,textAlign=TextAlign.Center),maxLines=if(tiny && longRoom) 4 else 3)
                }
            }
        }
        if(warnings.isNotEmpty()) Text(warnings.joinToString(" · "),GlanceModifier.semantics {
            contentDescription=buildList {
                if(state?.offline==true) add(context.getString(R.string.offline))
                if(state?.stale==true) add(context.getString(R.string.stale))
                if(state?.selectionRequired==true) add(context.getString(R.string.selection_required))
                if(state?.coverageIncomplete==true) add(context.getString(R.string.incomplete))
                if(state?.concurrent?.isNotEmpty()==true) add(context.getString(R.string.overlap))
            }.joinToString(" · ")
        },style=TextStyle(color=accent,fontSize=textSize(if(tiny) 9 else 10)),maxLines=if(size.height>=190.dp) 3 else 2)
        state?.next?.let { next ->
            Spacer(GlanceModifier.height(if(tiny) 3.dp else 5.dp))
            Row(GlanceModifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                Text((if(next.date!=lv.turiba.next.core.Riga.today(snapshot.asOf)) "${next.date} · " else "")+next.subject,GlanceModifier.defaultWeight(),style=TextStyle(color=foreground,fontSize=textSize(if(tiny) 9 else 11)),maxLines=if(tiny || tight || compact && fontScale>1.1f) 1 else 2)
                Text(next.startTime.toString(),GlanceModifier.padding(start=if(tiny) 3.dp else 6.dp),style=TextStyle(color=accent,fontSize=textSize(if(tiny) 13 else 17),fontWeight=FontWeight.Bold),maxLines=1)
            }
        }
    }
    }
}
abstract class ScheduleReceiver: GlanceAppWidgetReceiver() {
    override fun onReceive(context: Context,intent: Intent) {
        if(intent.action!=AppWidgetManager.ACTION_APPWIDGET_RESTORED) { super.onReceive(context,intent);return }
        val old=intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_OLD_IDS) ?: return
        val new=intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS) ?: return
        if(old.size!=new.size || old.toSet().size!=old.size || new.toSet().size!=new.size) return
        val manager=AppWidgetManager.getInstance(context)
        if(new.any { manager.getAppWidgetInfo(it)?.provider?.packageName!=context.packageName }) return
        // AppWidgetProvider otherwise dispatches onRestored AND Glance onUpdate, both taking goAsync.
        // Own this complete restore broadcast once; normal updates/deletes stay with Glance.
        val pending=goAsync();val app=context.applicationContext as NextApplication
        app.scope.launch { try {
            app.repository.restoreWidgets(old,new)
            for(id in new) {
                glanceAppWidget.update(context,GlanceAppWidgetManager(context).getGlanceIdBy(id))
                manager.updateAppWidgetOptions(id,android.os.Bundle().apply { putBoolean(AppWidgetManager.OPTION_APPWIDGET_RESTORE_COMPLETED,true) })
            }
            app.background.changed()
        } finally { pending?.finish() } }
    }
}
class SquareReceiver: ScheduleReceiver() { override val glanceAppWidget: GlanceAppWidget=SquareWidget() }
class RectangleReceiver: ScheduleReceiver() { override val glanceAppWidget: GlanceAppWidget=RectangleWidget() }
