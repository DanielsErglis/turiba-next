package lv.turiba.next

import android.Manifest
import android.app.*
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.core.net.toUri
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import lv.turiba.next.core.Reminders
import lv.turiba.next.reminders.*
import lv.turiba.next.storage.ReminderRecord
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidReminderPlatformTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    private fun permission(grant: Boolean) {
        if(Build.VERSION.SDK_INT>=33) instrumentation.uiAutomation.executeShellCommand(
            "pm ${if(grant) "grant" else "revoke"} ${context.packageName} ${Manifest.permission.POST_NOTIFICATIONS}")
            .use { android.os.ParcelFileDescriptor.AutoCloseInputStream(it).readBytes() }
    }
    private fun await(condition: ()->Boolean) {
        val deadline=android.os.SystemClock.elapsedRealtime()+3_000
        while(!condition() && android.os.SystemClock.elapsedRealtime()<deadline) Thread.sleep(25)
        assertTrue(condition())
    }
    @Test fun actualInexactPendingIntentAndOwnedNotificationCanBeCreatedAndCancelled() {
        permission(true)
        val platform=AndroidReminderPlatform(context)
        val manager=context.getSystemService(NotificationManager::class.java)
        val id=Reminders.PREFIX+"native-platform-test"
        val record=ReminderRecord(id,Reminders.OWNER,"synthetic","TVL2D1","2026-11-02",System.currentTimeMillis()+3_600_000,"test","Synthetic native platform test",0L)
        manager.createNotificationChannel(NotificationChannel("unrelated-test-channel","Unrelated test",NotificationManager.IMPORTANCE_LOW))
        val foreign=Notification.Builder(context,"unrelated-test-channel").setSmallIcon(R.drawable.reminder_icon).setContentTitle("Unrelated test").build()
        try {
            assertTrue(platform.permitted())
            platform.schedule(record)
            val intent=Intent(context,ReminderReceiver::class.java).setAction("lv.turiba.next.REMIND").setData("turibanext://reminder/$id".toUri()).putExtra("id",id)
            assertNotNull(PendingIntent.getBroadcast(context,0,intent,PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE))
            manager.notify("unrelated-test",4,foreign)
            assertTrue(platform.post(record))
            await { manager.activeNotifications.any { it.tag==id && it.notification.extras.getString("owner")==Reminders.OWNER } }
            platform.cancelOwnedActive()
            await { manager.activeNotifications.none { it.tag==id } }
            assertTrue(manager.activeNotifications.any { it.tag=="unrelated-test" })
            platform.cancel(record)
            assertNull(PendingIntent.getBroadcast(context,0,intent,PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE))
            platform.deleteOwnedChannels()
            assertNull(manager.getNotificationChannel("turiba-next.lessons"))
            assertNotNull(manager.getNotificationChannel("unrelated-test-channel"))
        } finally {
            platform.cancel(record);platform.deleteOwnedChannels()
            manager.cancel("unrelated-test",4);manager.deleteNotificationChannel("unrelated-test-channel")
            // Revoking a runtime grant here can kill the instrumentation UID. The host
            // uninstalls the test app after this run, which also removes its grant.
        }
    }
}
