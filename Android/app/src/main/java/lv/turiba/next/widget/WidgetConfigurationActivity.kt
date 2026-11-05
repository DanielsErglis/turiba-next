package lv.turiba.next.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import lv.turiba.next.NextApplication
import lv.turiba.next.R
import lv.turiba.next.core.ScheduleException
import lv.turiba.next.core.normalizeGroup
import lv.turiba.next.errorText
import lv.turiba.next.settings.Settings
import lv.turiba.next.storage.WidgetConfigurationTicket
import java.util.Locale

internal data class ConfigurationState(val input: String="",val busy: Boolean=true,val complete: Boolean=false,
    val error: String?=null,val settings: Settings=Settings())

/** One retained operation per configuration Activity. Rotation does not repeat validation or initialization. */
internal class WidgetConfigurationModel(private val app: NextApplication,private val id: Int,draft: String?,savedGeneration: Long?): ViewModel() {
    val state=MutableStateFlow(ConfigurationState())
    private var ticket: WidgetConfigurationTicket?=null
    val generation get()=ticket?.generation
    private fun bound()=AppWidgetManager.getInstance(app).getAppWidgetInfo(id)?.provider?.packageName==app.packageName
    init { viewModelScope.launch {
        try {
            val prepared=app.repository.widgetConfiguration(id)
            ticket=prepared.copy(generation=savedGeneration ?: prepared.generation)
            if(savedGeneration!=null && savedGeneration!=prepared.generation) throw ScheduleException("CONFIGURATION_EXPIRED")
            val settings=app.repository.settings.read()
            state.value=state.value.copy(settings=settings,input=draft ?: prepared.existingGroup ?: "")
            if(prepared.existingGroup==null && prepared.mainGroup!=null && draft.isNullOrBlank()) {
                finish(prepared.mainGroup)
            } else state.value=state.value.copy(busy=false)
        } catch(e: CancellationException) { throw e }
        catch(e: Exception) { state.value=state.value.copy(busy=false,error=(e as? ScheduleException)?.code ?: "OPERATION_FAILED") }
    } }
    fun input(value: String) { if(!state.value.busy) state.value=state.value.copy(input=value,error=null) }
    fun save() {
        if(state.value.busy) return
        state.value=state.value.copy(busy=true,error=null)
        viewModelScope.launch {
            try {
                val group=normalizeGroup(state.value.input)
                if(group!=ticket?.existingGroup && group!=ticket?.mainGroup) app.repository.validateGroup(group)
                finish(group)
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) { state.value=state.value.copy(busy=false,error=(e as? ScheduleException)?.code ?: "OPERATION_FAILED") }
        }
    }
    private suspend fun finish(group: String) {
        app.repository.completeWidgetConfiguration(checkNotNull(ticket),group,::bound)
        ticket=app.repository.widgetConfiguration(id)
        state.value=state.value.copy(input=group)
        // Explicitly publish the initial RemoteViews before returning RESULT_OK to the launcher.
        val glance=androidx.glance.appwidget.GlanceAppWidgetManager(app).getGlanceIdBy(id)
        val provider=AppWidgetManager.getInstance(app).getAppWidgetInfo(id)?.provider
        if(provider?.className==SquareReceiver::class.java.name) SquareWidget().update(app,glance) else RectangleWidget().update(app,glance)
        state.value=state.value.copy(busy=false,complete=true)
    }
}

class WidgetConfigurationActivity: ComponentActivity() {
    private lateinit var model: WidgetConfigurationModel
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);enableEdgeToEdge();setResult(RESULT_CANCELED)
        val id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID)
        if(id<0 || AppWidgetManager.getInstance(this).getAppWidgetInfo(id)?.provider?.packageName!=packageName) { finish();return }
        val app=application as NextApplication
        model=ViewModelProvider(this,object: ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST") override fun <T: ViewModel> create(modelClass: Class<T>): T =
                WidgetConfigurationModel(app,id,savedInstanceState?.getString("draft"),savedInstanceState?.takeIf { it.containsKey("generation") }?.getLong("generation")) as T
        })[WidgetConfigurationModel::class.java]
        setContent {
            val state by model.state.collectAsState()
            LaunchedEffect(state.complete) { if(state.complete) {
                setResult(RESULT_OK,Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id));finish()
            } }
            val base=LocalContext.current;val config=LocalConfiguration.current
            val localized=remember(config,state.settings.language) {
                val c=Configuration(config)
                if(state.settings.language!="system") c.setLocale(Locale.forLanguageTag(state.settings.language))
                base.createConfigurationContext(c)
            }
            val dark=state.settings.theme=="dark" || state.settings.theme=="system" && isSystemInDarkTheme()
            SideEffect { androidx.core.view.WindowCompat.getInsetsController(window,window.decorView).apply {
                isAppearanceLightStatusBars=!dark;isAppearanceLightNavigationBars=!dark
            } }
            CompositionLocalProvider(LocalContext provides localized) {
                MaterialTheme(colorScheme=if(dark) darkColorScheme() else lightColorScheme()) {
                    Surface(Modifier.fillMaxSize()) {
                        Column(Modifier.fillMaxSize().systemBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
                            Text(stringResource(R.string.widget_configure),style=MaterialTheme.typography.headlineSmall)
                            if(state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                            else {
                                OutlinedTextField(value=state.input,onValueChange=model::input,singleLine=true,label={Text(stringResource(R.string.group))},modifier=Modifier.fillMaxWidth())
                                Text(stringResource(R.string.widget_group_help))
                                Button(onClick=model::save,enabled=state.input.isNotBlank()) { Text(stringResource(R.string.widget_save)) }
                                state.error?.let { Text(errorText(it),color=MaterialTheme.colorScheme.error) }
                                TextButton(onClick={finish()}) { Text(stringResource(R.string.cancel)) }
                            }
                        }
                    }
                }
            }
        }
    }
    override fun onSaveInstanceState(outState: Bundle) {
        if(::model.isInitialized) outState.putString("draft",model.state.value.input)
        if(::model.isInitialized) model.generation?.let { outState.putLong("generation",it) }
        super.onSaveInstanceState(outState)
    }
}
