package lv.turiba.next

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import lv.turiba.next.core.*
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.time.*
import java.util.Base64

@RunWith(AndroidJUnit4::class)
class NativeCoreParityTest {
    private val assets get()=InstrumentationRegistry.getInstrumentation().context.assets
    private fun raw(name: String)=assets.open("raw/$name").bufferedReader().use { it.readText() }
    private fun lines(name: String): List<List<String>> {
        // AAPT expands .gz assets and removes their suffix when constructing the test APK.
        return assets.open("parity/"+name.removeSuffix(".gz")).bufferedReader().use { it.readLines() }
            .map { it.split('\t').map { field -> String(Base64.getDecoder().decode(field),Charsets.UTF_8) } }
    }
    private fun strings(vararg values: Any?)=values.map { it?.toString() ?: "~" }
    private val catalog by lazy { Parser.mergeCatalogs(listOf("home.html","college.html","masters.html","doctoral.html","branches.html").map { Parser.catalog(raw(it)) }) }
    private val weeks by lazy {
        assets.list("parity")!!.filter { it.endsWith(".html.golden") }.sorted().map { filename ->
            val file=filename.removeSuffix(".golden");val group=if(file=="unknown-group.html") "NONEXISTENTPHASE0" else file.substringBefore('-').uppercase()
            file to Parser.schedule(raw(file),group,catalog,catalogComplete=group!="NONEXISTENTPHASE0")
        }
    }
    @Test fun capturedHtmlAndCatalogMatchJsOnTheActualAndroidRuntime() {
        assertEquals(lines("catalog.golden"),catalog.map { strings(it.code,it.branch,it.source) })
        assertEquals(18,weeks.size)
        for((name,w) in weeks) {
            val actual=listOf(strings(w.group,w.branch,w.weekStart,w.weekEnd,w.status,w.warnings.joinToString("|"),w.navigation["previous"],w.navigation["current"],w.navigation["next"])) + w.lessons.map { l ->
                strings(l.date,l.startTime,l.endTime,l.subject,l.room,l.period,l.group,l.sourceGroup,l.subgroup,l.category,l.type,l.elective,l.requiresSelection,l.provisional,l.individualSchedule,l.deliveryModeUnspecified,l.changed,l.source,l.choiceKey)
            }
            assertEquals(name,lines("$name.golden"),actual)
        }
    }
    @Test fun all978StateBoundariesMatchJsOnAndroid() {
        val published=weeks.map { it.second }.filter { it.status=="published" }
        val expectedLines=lines("states.golden.gz");assertEquals(978,expectedLines.size)
        for(expected in expectedLines) {
            val (group,millis,choiceMode)=expected
            val choices=if(choiceMode=="all") published.filter { it.group==group }.flatMap { it.lessons }.filter { it.requiresSelection }.map { it.choiceKey }.toSet() else emptySet()
            val s=Engine.state(group,published,choices,Instant.ofEpochMilli(millis.toLong()),true,true)
            assertEquals("$group/$millis/$choiceMode",expected,strings(group,millis,choiceMode,s.status,s.current?.choiceKey,s.next?.choiceKey,s.concurrent.size,s.selectionRequired,s.coverageIncomplete,s.offline,s.stale,s.issue,s.refreshAt.toEpochMilli()))
        }
    }
    @Test fun all48ReminderPlansMatchJsOnAndroid() {
        val expectedLines=lines("reminders.golden.gz");assertEquals(48,expectedLines.size)
        for(values in expectedLines) {
            val group=values[0];val lead=values[1].toInt();val language=values[2];val mode=values[3]
            val week=weeks.first { it.first==group.lowercase()+"-current.html" }.second
            val choices=if(mode=="all") week.lessons.filter { it.requiresSelection }.map { it.choiceKey }.toSet() else emptySet()
            val noRoom=when(language) {"lv"->"Auditorija nav norādīta";"ru"->"Аудитория не указана";else->"Room not provided"}
            val actual=Reminders.plan(true,group,choices,listOf(week),Instant.parse("2026-10-26T00:00:00Z"),lead,language,noRoom)
                .map { Json.array(it.id,it.trigger.toEpochMilli().toString(),it.body,it.fingerprint,it.weekStart) }
            assertEquals("$group/$lead/$language/$mode",values.drop(4),actual)
        }
    }
    @Test fun nativeRigaDstUnicodeAndCollationRemainExplicit() {
        for((date,code) in listOf("2026-03-29" to "NONEXISTENT_LOCAL_TIME","2026-10-25" to "AMBIGUOUS_LOCAL_TIME")) {
            try { Riga.instant(LocalDate.parse(date),LocalTime.parse("03:30"));fail(code) } catch(e: ScheduleException) { assertEquals(code,e.code) }
        }
        for(value in lines("identity.golden")) {
            assertEquals(value[1],Json.array(value[0],value[0]));assertEquals(value[2],ReminderIdentity.fingerprint(value[0]))
        }
        val expected=lines("collation.golden").map { it.single() }
        val base=weeks.first { it.first=="tvl2d1-current.html" }.second
        val lesson=base.lessons.first().copy(requiresSelection=false)
        val state=Engine.state(base.group,listOf(base.copy(lessons=expected.reversed().map { lesson.copy(subject=it) })),emptySet(),lesson.start)
        assertEquals(expected,(listOf(state.current!!)+state.concurrent).map { it.subject })
    }
}
