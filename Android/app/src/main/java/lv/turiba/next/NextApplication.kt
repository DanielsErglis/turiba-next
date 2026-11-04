package lv.turiba.next

import android.app.Application
import androidx.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Dispatchers
import lv.turiba.next.storage.*
import lv.turiba.next.source.SourceClient
import lv.turiba.next.settings.SettingsStore

class NextApplication : Application() {
    val scope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
    val repository by lazy {
        Repository(Room.databaseBuilder(this,ScheduleDatabase::class.java,"turiba-next.db").build(),SettingsStore(this),SourceClient(),scope).also { repo ->
            repo.onChanged={ lv.turiba.next.widget.WidgetUpdates.update(this) }
        }
    }
}
