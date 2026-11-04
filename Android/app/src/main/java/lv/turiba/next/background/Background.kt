package lv.turiba.next.background

import android.content.*
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import lv.turiba.next.NextApplication
import lv.turiba.next.core.Riga
import lv.turiba.next.reminders.ReminderCoordinator
import lv.turiba.next.storage.Repository
import lv.turiba.next.widget.WidgetUpdates
import java.time.*
import java.util.concurrent.TimeUnit

class Background(private val context: Context,private val repository: Repository,private val reminders: ()->ReminderCoordinator) {
    private val guard=Mutex()
    private val work get()=WorkManager.getInstance(context)
    companion object {
        const val NETWORK="turiba-next.network"
        const val PERIODIC="turiba-next.periodic"
        const val BOUNDARY="turiba-next.boundary"
        const val GENERATION="generation"
    }
    suspend fun changed()=guard.withLock {
        WidgetUpdates.update(context)
        recurring()
        boundary(false)
        if(repository.settings.read().reminders) reminders().reconcile()
    }
    suspend fun restore() {
        changed()
        if(repository.settings.read().reminders) reminders().reconcile(forceReschedule=true)
        repository.withConfiguredTicket { ticket ->
            if(ticket.groups.isNotEmpty()) {
                val request=OneTimeWorkRequestBuilder<SyncWorker>().setInputData(workDataOf(GENERATION to ticket.generation))
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).addTag(NETWORK).build()
                work.enqueueUniqueWork(NETWORK,ExistingWorkPolicy.KEEP,request).result.get(10,TimeUnit.SECONDS)
            }
        }
    }
    private suspend fun recurring()=repository.withConfiguredTicket { ticket ->
        if(ticket.groups.isEmpty()) return@withConfiguredTicket
        val request=PeriodicWorkRequestBuilder<SyncWorker>(1,TimeUnit.HOURS)
            .setInitialDelay(1,TimeUnit.HOURS)
            .setInputData(workDataOf(GENERATION to ticket.generation))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).addTag(NETWORK).build()
        work.enqueueUniquePeriodicWork(PERIODIC,ExistingPeriodicWorkPolicy.KEEP,request).result.get(10,TimeUnit.SECONDS)
    }
    suspend fun localBoundary()=guard.withLock {
        WidgetUpdates.update(context)
        boundary(true)
    }
    private suspend fun boundary(append: Boolean) {
        val now=Instant.now()
        val ticket=repository.configuredTicket()
        if(ticket.groups.isEmpty()) return
        val boundaries=mutableListOf(Riga.instant(Riga.today(now).plusDays(1),LocalTime.MIDNIGHT))
        for(group in ticket.groups) {
            val snapshot=repository.snapshot(group,now)
            snapshot.weeks.flatMap { it.lessons }.forEach { boundaries.addAll(listOf(it.start.minusSeconds(600),it.start,it.end)) }
            snapshot.lastSync?.plusSeconds(900)?.takeIf { it>now }?.let { boundaries.add(it) }
        }
        val next=boundaries.filter { it>now }.min()
        repository.withConfiguredTicket { current ->
            if(current.generation!=ticket.generation || current.groups.isEmpty()) return@withConfiguredTicket
            val request=OneTimeWorkRequestBuilder<BoundaryWorker>().setInputData(workDataOf(GENERATION to ticket.generation))
                .setInitialDelay(Duration.between(now,next).toMillis().coerceAtLeast(15_000),TimeUnit.MILLISECONDS).addTag(BOUNDARY).build()
            work.enqueueUniqueWork(BOUNDARY,if(append) ExistingWorkPolicy.APPEND_OR_REPLACE else ExistingWorkPolicy.REPLACE,request).result.get(10,TimeUnit.SECONDS)
        }
    }
    // Called while repository deletion holds its mutation lock. Never take this class's guard here.
    suspend fun cancelOwnedWhileLocked()=withContext(Dispatchers.IO) {
        work.cancelAllWorkByTag(NETWORK).result.get(10,TimeUnit.SECONDS)
        work.cancelAllWorkByTag(BOUNDARY).result.get(10,TimeUnit.SECONDS)
    }
}
class SyncWorker(context: Context,parameters: WorkerParameters): CoroutineWorker(context,parameters) {
    override suspend fun doWork(): Result {
        val app=applicationContext as NextApplication
        val ticket=app.repository.configuredTicket()
        if(inputData.getLong(Background.GENERATION,-1)!=ticket.generation || ticket.groups.isEmpty()) return Result.success()
        var transient=false
        for(group in ticket.groups) {
            app.repository.synchronize(group,force=runAttemptCount>0,expectedGeneration=ticket.generation)
            if(app.repository.snapshot(group).state.issue in listOf("NETWORK_ERROR","NETWORK_TIMEOUT","HTTP_ERROR")) transient=true
        }
        app.background.changed()
        return if(transient && runAttemptCount<2) Result.retry() else Result.success()
    }
}
class BoundaryWorker(context: Context,parameters: WorkerParameters): CoroutineWorker(context,parameters) {
    override suspend fun doWork(): Result {
        val app=applicationContext as NextApplication
        if(inputData.getLong(Background.GENERATION,-1)!=app.repository.configuredTicket().generation) return Result.success()
        app.background.localBoundary()
        return Result.success()
    }
}
class SystemEventsReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context,intent: Intent) {
        if(intent.action !in setOf(Intent.ACTION_BOOT_COMPLETED,Intent.ACTION_MY_PACKAGE_REPLACED,Intent.ACTION_TIME_CHANGED,Intent.ACTION_TIMEZONE_CHANGED)) return
        val pending=goAsync();val app=context.applicationContext as NextApplication
        app.scope.launch { try { app.background.restore() } finally { pending.finish() } }
    }
}
