package lv.turiba.next.reminders

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.core.net.toUri
import kotlinx.coroutines.launch
import lv.turiba.next.*
import lv.turiba.next.R
import lv.turiba.next.core.Reminders
import lv.turiba.next.storage.ReminderRecord

class AndroidReminderPlatform(private val context: Context): ReminderPlatform {
    private val alarms by lazy { context.getSystemService(AlarmManager::class.java) }
    private val notifications by lazy { context.getSystemService(NotificationManager::class.java) }
    override fun permitted(): Boolean = (Build.VERSION.SDK_INT<33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED) && notifications.areNotificationsEnabled()
    private fun pending(record: ReminderRecord,flags: Int): PendingIntent?=PendingIntent.getBroadcast(context,0,
        Intent(context,ReminderReceiver::class.java).setAction("lv.turiba.next.REMIND")
            .setData("turibanext://reminder/${record.id}".toUri()).putExtra("id",record.id),flags or PendingIntent.FLAG_IMMUTABLE)
    override fun schedule(record: ReminderRecord) {
        // Intentionally inexact: no exact-alarm permission or privileged access is requested.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,record.triggerAt,pending(record,PendingIntent.FLAG_UPDATE_CURRENT)!!)
    }
    override fun cancel(record: ReminderRecord) {
        pending(record,PendingIntent.FLAG_NO_CREATE)?.let { alarms.cancel(it);it.cancel() }
        notifications.cancel(record.id,0)
    }
    override fun cancelOwnedActive() {
        notifications.activeNotifications.filter { it.tag?.startsWith(Reminders.PREFIX)==true && it.notification.extras.getString("owner")==Reminders.OWNER }
            .forEach { notifications.cancel(it.tag,it.id) }
    }
    override fun deleteOwnedChannels() { notifications.deleteNotificationChannel("turiba-next.lessons") }
    override fun post(record: ReminderRecord): Boolean {
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return false
        if(!notifications.areNotificationsEnabled()) return false
        notifications.createNotificationChannel(NotificationChannel("turiba-next.lessons",context.getString(R.string.reminders),NotificationManager.IMPORTANCE_DEFAULT))
        val open=PendingIntent.getActivity(context,0,Intent(context,MainActivity::class.java).setData("turibanext://main".toUri()),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification=Notification.Builder(context,"turiba-next.lessons").setSmallIcon(R.drawable.reminder_icon)
            .setContentTitle("TURĪBA NEXT").setContentText(record.body).setStyle(Notification.BigTextStyle().bigText(record.body))
            .setWhen(record.triggerAt).setContentIntent(open).setAutoCancel(true)
            .setExtras(Bundle().apply { putString("owner",Reminders.OWNER) }).build()
        return try { notifications.notify(record.id,0,notification);true } catch(_: SecurityException) { false }
    }
}
class ReminderReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context,intent: Intent) {
        if(intent.action!="lv.turiba.next.REMIND") return
        val id=intent.getStringExtra("id")?.takeIf { it.startsWith(Reminders.PREFIX) } ?: return
        val pending=goAsync();val app=context.applicationContext as NextApplication
        app.scope.launch { try { app.reminders.deliver(id) } finally { pending.finish() } }
    }
}
