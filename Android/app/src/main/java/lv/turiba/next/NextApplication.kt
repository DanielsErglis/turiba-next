package lv.turiba.next

import android.app.Application
import androidx.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import lv.turiba.next.storage.*
import lv.turiba.next.source.SourceClient
import lv.turiba.next.settings.SettingsStore
import lv.turiba.next.reminders.*
import lv.turiba.next.background.Background

open class NextApplication : Application() {
    protected open val automaticRestore=true
    val runtimeIssue=MutableStateFlow<String?>(null)
    val scope=CoroutineScope(SupervisorJob()+Dispatchers.Default+CoroutineExceptionHandler { _,error ->
        runtimeIssue.value=(error as? lv.turiba.next.core.ScheduleException)?.code ?: "BACKGROUND_ERROR"
    })
    val repository: Repository by lazy {
        Repository(Room.databaseBuilder(this,ScheduleDatabase::class.java,"turiba-next.db").addMigrations(MIGRATION_1_2).build(),SettingsStore(this),SourceClient(),scope).also { repo ->
            repo.onChanged={ background.changed() }
        }
    }
    val reminders: ReminderCoordinator by lazy { ReminderCoordinator(repository,AndroidReminderPlatform(this)) { settings ->
        val config=android.content.res.Configuration(resources.configuration)
        if(settings.language!="system") config.setLocale(java.util.Locale.forLanguageTag(settings.language))
        val localized=createConfigurationContext(config)
        val language=localized.resources.configuration.locales[0].language.takeIf { it in listOf("lv","en","ru") } ?: "en"
        language to localized.getString(R.string.no_room)
    } }
    val background: Background by lazy { Background(this,repository) { reminders } }
    override fun onCreate() {
        super.onCreate()
        if(automaticRestore) scope.launch { background.restore() }
    }
    suspend fun setReminders(enabled: Boolean) {
        repository.edit { it.copy(reminders=enabled) }
        if(enabled) reminders.reconcile() else reminders.cancelOwned()
    }
    suspend fun deleteData()=repository.deleteData { background.cancelOwnedWhileLocked();reminders.cancelOwnedWhileLocked(deleteChannels=true) }
}
