package lv.turiba.next.settings

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import lv.turiba.next.core.normalizeGroup

private val Context.preferences by preferencesDataStore("turiba-next")
data class Settings(val group: String? = null, val language: String = "system", val theme: String = "system",
    val reminders: Boolean = false, val leadMinutes: Int = 10, val choices: Map<String,Set<String>> = emptyMap())

class SettingsStore(context: Context) {
    private val store = context.preferences
    private val group = stringPreferencesKey("group")
    private val language = stringPreferencesKey("language")
    private val theme = stringPreferencesKey("theme")
    private val reminders = booleanPreferencesKey("reminders")
    private val lead = intPreferencesKey("lead")
    suspend fun read(): Settings {
        val p = store.data.first()
        val result = Settings(p[group]?.let(::normalizeGroup),p[language] ?: "system",p[theme] ?: "system",p[reminders] ?: false,p[lead] ?: 10,
            p.asMap().filterKeys { it.name.startsWith("choices:") }.map { (k,v) -> normalizeGroup(k.name.removePrefix("choices:")) to (v as Set<*>).map { it as String }.toSet() }.toMap())
        require(result.language in listOf("system","lv","en","ru") && result.theme in listOf("system","light","dark") && result.leadMinutes in listOf(5,10,15,30)) { "INVALID_SETTINGS" }
        return result
    }
    suspend fun save(settings: Settings) {
        require(settings.language in listOf("system","lv","en","ru") && settings.theme in listOf("system","light","dark") && settings.leadMinutes in listOf(5,10,15,30))
        store.edit { p ->
            p.clear()
            settings.group?.let { p[group] = normalizeGroup(it) }
            p[language]=settings.language; p[theme]=settings.theme; p[reminders]=settings.reminders; p[lead]=settings.leadMinutes
            settings.choices.forEach { (g,c) -> p[stringSetPreferencesKey("choices:"+normalizeGroup(g))]=c }
        }
    }
    suspend fun clear() { store.edit { it.clear() } }
}
