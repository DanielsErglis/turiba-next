package lv.turiba.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.isSystemInDarkTheme
import kotlinx.coroutines.*
import lv.turiba.next.core.*
import lv.turiba.next.settings.*
import lv.turiba.next.storage.*
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale

open class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val id=intent.getIntExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,-1).takeIf { it>=0 }
        val configure=intent.action==android.appwidget.AppWidgetManager.ACTION_APPWIDGET_CONFIGURE
        if(configure && id==null) { finish();return }
        if(id!=null && android.appwidget.AppWidgetManager.getInstance(this).getAppWidgetInfo(id)?.provider?.packageName!=packageName) { finish();return }
        if(configure) setResult(RESULT_CANCELED)
        setContent { AppScreen((application as NextApplication).repository,id,if(configure) ({
            setResult(RESULT_OK,android.content.Intent().putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,id ?: -1));finish()
        }) else null,intent.getBooleanExtra("refresh",false) && savedInstanceState==null) }
    }
}

@Composable fun AppScreen(repository: Repository,widgetId: Int?=null,onConfigured: (()->Unit)?=null,autoSync: Boolean=false) {
    val scope=rememberCoroutineScope()
    val revision by repository.revision.collectAsState()
    var tick by remember { mutableLongStateOf(0) }
    var snapshot by remember { mutableStateOf<Snapshot?>(null) }
    var failure by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var input by rememberSaveable(widgetId) { mutableStateOf("") }
    var showDelete by remember { mutableStateOf(false) }
    var showAbout by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { while(true) { delay(30_000); tick++ } }
    LaunchedEffect(snapshot?.state?.refreshAt) {
        snapshot?.state?.refreshAt?.let { next -> delay(java.time.Duration.between(Instant.now(),next).toMillis().coerceAtLeast(50));tick++ }
    }
    LaunchedEffect(revision,tick) {
        try { snapshot=repository.snapshot(widgetId=widgetId) } catch (_: Exception) { failure="STORAGE_ERROR" }
    }
    LaunchedEffect(autoSync) {
        if(autoSync) {
            busy=true
            try { repository.synchronizeVisible(widgetId,true) }
            catch(e: CancellationException) { throw e }
            catch(_: Exception) { failure="SYNC_FAILED" }
            finally { busy=false;tick++ }
        }
    }
    val settings=snapshot?.settings ?: Settings()
    val baseContext=LocalContext.current
    val deviceConfiguration=LocalConfiguration.current
    val localized=remember(baseContext,deviceConfiguration,settings.language) {
        val configuration=android.content.res.Configuration(deviceConfiguration)
        if (settings.language!="system") configuration.setLocale(Locale.forLanguageTag(settings.language))
        baseContext.createConfigurationContext(configuration)
    }
    val dark=settings.theme=="dark" || settings.theme=="system" && isSystemInDarkTheme()
    SideEffect { (baseContext as? android.app.Activity)?.window?.let {
        androidx.core.view.WindowCompat.getInsetsController(it,it.decorView).isAppearanceLightStatusBars=!dark
        androidx.core.view.WindowCompat.getInsetsController(it,it.decorView).isAppearanceLightNavigationBars=!dark
    } }
    val colors=if(dark) darkColorScheme(primary=Color(0xff7cd5ff),background=Color(0xff071a2c),surface=Color(0xff102b45),secondaryContainer=Color(0xff245071),onSecondaryContainer=Color(0xffeef6ff)) else lightColorScheme(primary=Color(0xff006398),background=Color(0xffedf6ff),surface=Color.White,secondaryContainer=Color(0xffcde9ff),onSecondaryContainer=Color(0xff102b45))
    fun action(block: suspend ()->Unit) {
        scope.launch {
            busy=true; failure=null
            (baseContext.applicationContext as NextApplication).runtimeIssue.value=null
            try { block() } catch(e: CancellationException) { throw e }
            catch(e: Exception) { failure=(e as? ScheduleException)?.code ?: "OPERATION_FAILED" }
            finally { busy=false; tick++ }
        }
    }
    val app=baseContext.applicationContext as NextApplication
    val backgroundFailure by app.runtimeIssue.collectAsState()
    val notificationPermission=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        action { if(granted) app.setReminders(true) else failure="NOTIFICATION_PERMISSION_DENIED" }
    }
    CompositionLocalProvider(LocalContext provides localized) {
        MaterialTheme(colorScheme=colors) {
            Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
                Column(Modifier.fillMaxSize().systemBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                    Text("TURĪBA NEXT",fontSize=28.sp,color=MaterialTheme.colorScheme.primary)
                    Text(stringResource(R.string.language),style=MaterialTheme.typography.titleMedium)
                    FlowRow(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                        listOf("system" to stringResource(R.string.system),"lv" to "LV","en" to "EN","ru" to "RU").forEach { (value,label) ->
                            FilterChip(selected=settings.language==value,onClick={action { repository.edit { it.copy(language=value) } }},label={Text(label)},enabled=!busy)
                        }
                    }
                    if(snapshot==null && failure==null) CircularProgressIndicator()
                    val state=snapshot?.state
                    if(snapshot?.group!=null && state!=null) {
                        Text(snapshot!!.group!!,style=MaterialTheme.typography.titleMedium)
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                                Text(statusText(state.status),color=MaterialTheme.colorScheme.primary)
                                state.current?.let { lesson ->
                                    Text(lesson.subject,fontSize=30.sp,lineHeight=35.sp)
                                    Text(lesson.room ?: stringResource(R.string.no_room),fontSize=36.sp)
                                    Text("${lesson.date} · ${lesson.startTime}–${lesson.endTime}")
                                }
                                state.concurrent.forEach { Text(stringResource(R.string.overlap)+": "+it.subject+" · "+(it.room ?: stringResource(R.string.no_room))) }
                                state.next?.let { Text(stringResource(R.string.next)+": "+it.subject+"\n${it.date} · ${it.startTime}") }
                                if(state.offline) Text(stringResource(R.string.offline))
                                if(state.stale) Text(stringResource(R.string.stale))
                                if(state.selectionRequired) Text(stringResource(R.string.selection_required))
                                if(state.coverageIncomplete) Text(stringResource(R.string.incomplete))
                                state.issue?.let { Text(errorText(it)) }
                            }
                        }
                        Text(stringResource(R.string.last_sync)+": "+(snapshot!!.lastSync?.atZone(Riga.zone)?.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")) ?: "—"))
                        Button(onClick={ action { repository.synchronizeVisible(widgetId,true) } },enabled=!busy) { Text(stringResource(R.string.sync)) }
                    } else Text(stringResource(R.string.setup),style=MaterialTheme.typography.headlineSmall)
                    OutlinedTextField(value=input,onValueChange={input=it},label={Text(stringResource(R.string.group))},singleLine=true,modifier=Modifier.fillMaxWidth(),enabled=!busy)
                    Button(onClick={ action {
                        val group=normalizeGroup(input)
                        repository.saveGroup(group,widgetId) {
                            widgetId==null || android.appwidget.AppWidgetManager.getInstance(baseContext).getAppWidgetInfo(widgetId)?.provider?.packageName==baseContext.packageName
                        }
                        input=""
                        onConfigured?.invoke()
                    } },enabled=!busy && input.isNotBlank()) { Text(stringResource(R.string.save_group)) }
                    val alternatives=snapshot?.weeks.orEmpty().flatMap { it.lessons }.filter { it.requiresSelection }.distinctBy { it.choiceKey }
                    if(alternatives.isNotEmpty()) {
                        Text(stringResource(R.string.choices),style=MaterialTheme.typography.titleLarge)
                        Text(stringResource(R.string.choices_help))
                        alternatives.forEach { lesson ->
                            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                                Checkbox(checked=lesson.choiceKey in settings.choices[lesson.group].orEmpty(),onCheckedChange={ checked -> action {
                                    repository.edit { old ->
                                        val selected=old.choices[lesson.group].orEmpty().toMutableSet()
                                        if(checked) selected.add(lesson.choiceKey) else selected.remove(lesson.choiceKey)
                                        old.copy(choices=old.choices+(lesson.group to selected))
                                    }
                                } },enabled=!busy)
                                Text(lesson.subject+" · "+lesson.sourceGroup,Modifier.padding(top=12.dp))
                            }
                        }
                    }
                    Text(stringResource(R.string.theme),style=MaterialTheme.typography.titleMedium)
                    FlowRow(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                        listOf("system" to stringResource(R.string.system),"light" to stringResource(R.string.light),"dark" to stringResource(R.string.dark)).forEach { (value,label) ->
                            FilterChip(selected=settings.theme==value,onClick={action { repository.edit { it.copy(theme=value) } }},label={Text(label)},enabled=!busy)
                        }
                    }
                    if(widgetId==null) {
                        Row(Modifier.fillMaxWidth()) {
                            Checkbox(checked=settings.reminders,onCheckedChange={ enabled ->
                                if(!enabled) action { app.setReminders(false) }
                                else if(android.os.Build.VERSION.SDK_INT>=33 && baseContext.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                    notificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                                } else action {
                                    if(lv.turiba.next.reminders.AndroidReminderPlatform(baseContext).permitted()) app.setReminders(true)
                                    else failure="NOTIFICATION_PERMISSION_DENIED"
                                }
                            },enabled=!busy && settings.group!=null)
                            Text(stringResource(R.string.reminders)+(settings.group?.let { " · $it" } ?: ""),Modifier.padding(top=12.dp))
                        }
                        Text(stringResource(R.string.reminder_delay))
                        FlowRow(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                            listOf(5,10,15,30).forEach { lead ->
                                FilterChip(selected=settings.leadMinutes==lead,onClick={action { repository.edit { it.copy(leadMinutes=lead) } }},enabled=!busy,label={Text("$lead "+stringResource(R.string.minutes))})
                            }
                        }
                        if(failure=="NOTIFICATION_PERMISSION_DENIED") TextButton(onClick={
                            baseContext.startActivity(android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,baseContext.packageName))
                        }) { Text(stringResource(R.string.notification_settings)) }
                    }
                    Text(stringResource(R.string.widget_help))
                    if(busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    (failure ?: backgroundFailure)?.let { Text(errorText(it),color=MaterialTheme.colorScheme.error) }
                    TextButton(onClick={showAbout=true}) { Text(stringResource(R.string.about)) }
                    TextButton(onClick={showDelete=true},enabled=!busy) { Text(stringResource(R.string.delete_data),color=MaterialTheme.colorScheme.error) }
                    if(showAbout) AlertDialog(onDismissRequest={showAbout=false},title={Text(localized.getString(R.string.about))},text={Text(localized.getString(R.string.privacy))},confirmButton={TextButton(onClick={showAbout=false}) {Text(localized.getString(R.string.close))}})
                    if(showDelete) AlertDialog(onDismissRequest={showDelete=false},title={Text(localized.getString(R.string.delete_data))},text={Text(localized.getString(R.string.delete_confirm))},
                        confirmButton={TextButton(onClick={showDelete=false; action { app.deleteData(); input="" }}) { Text(localized.getString(R.string.delete_data)) }},
                        dismissButton={TextButton(onClick={showDelete=false}) { Text(localized.getString(R.string.cancel)) }})
                }
            }
        }
    }
}

@Composable fun statusText(status: String): String = stringResource(when(status) {
    "ongoing"->R.string.ongoing; "soon"->R.string.soon; "upcoming"->R.string.upcoming
    "finished"->R.string.finished; "noSchedule"->R.string.no_schedule; "setupRequired"->R.string.setup
    else->R.string.source_error
})

@Composable fun errorText(code: String): String=stringResource(when(code) {
    "INVALID_GROUP"->R.string.invalid_group
    "UNKNOWN_GROUP"->R.string.unknown_group
    "NETWORK_ERROR","NETWORK_TIMEOUT"->R.string.network_error
    "SOURCE_UNPUBLISHED","SOURCE_EMPTYUNCONFIRMED","SOURCE_UNVERIFIEDGROUP"->R.string.unpublished
    "HTML_PARSE_ERROR","SOURCE_STRUCTURE_CHANGED","WEEK_MISMATCH","TIME_GRID_MISSING"->R.string.structure_error
    "CORRUPT_CACHE","STORAGE_ERROR"->R.string.storage_error
    "NOTIFICATION_PERMISSION_DENIED"->R.string.notification_denied
    else->R.string.operation_failed
})+" · "+code
