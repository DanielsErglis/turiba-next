package lv.turiba.next.core

import org.junit.Test
import org.junit.Assert.*
import java.io.File
import java.time.*
import java.util.Base64
import java.util.TimeZone
import java.security.MessageDigest

class ParityTest {
    private val root = File(System.getProperty("repositoryRoot"))
    private val raw = File(root, "tests/fixtures/raw")
    private val golden = File(root, "Android/core/src/test/resources/parity")
    private val catalogNames = listOf("home.html", "college.html", "masters.html", "doctoral.html", "branches.html")
    private fun catalog() = Parser.mergeCatalogs(catalogNames.map { Parser.catalog(File(raw,it).readText()) })
    private fun lines(name: String): List<List<String>> {
        val source = if (name.endsWith(".gz")) java.util.zip.GZIPInputStream(File(golden,name).inputStream()) else File(golden,name).inputStream()
        return source.bufferedReader().use { it.readLines() }.map { line -> line.split('\t').map { String(Base64.getDecoder().decode(it), Charsets.UTF_8) } }
    }
    private fun strings(vararg values: Any?) = values.map { it?.toString() ?: "~" }
    private fun week(file: File): Week {
        val html = file.readText()
        val heading = Html.parse(html).all { it.tag == "h2" && it.text().startsWith("Grupa ") }.single().text()
        val group = heading.split(' ')[1]
        return Parser.schedule(html, group, catalog(), catalogComplete = group != "NONEXISTENTPHASE0")
    }
    private fun error(code: String, block: () -> Unit) {
        try { block(); fail("Expected $code") } catch (e: ScheduleException) { assertEquals(code, e.code) }
    }
    @Test fun catalogMatchesAll279SourceGroups() {
        assertEquals(lines("catalog.golden"), catalog().map { strings(it.code,it.branch,it.source) })
    }
    @Test fun currentDesktopContractHasCapturedCatalogAndTwoPublishedWeeks() {
        val folder=File(root,"Android/core/src/test/resources/captured-2026-11-04")
        val manifest=folder.resolve("manifest.json").readText()
        val entries=Regex("\\\"file\\\": \\\"([^\\\"]+)\\\"[\\s\\S]*?\\\"sha256\\\": \\\"([a-f0-9]{64})\\\"").findAll(manifest).toList()
        assertEquals(7,entries.size)
        for(entry in entries) {
            val digest=MessageDigest.getInstance("SHA-256").digest(folder.resolve(entry.groupValues[1]).readBytes()).joinToString("") { "%02x".format(it) }
            assertEquals(entry.groupValues[1],entry.groupValues[2],digest)
        }
        val latest=Parser.mergeCatalogs(listOf("home","lim1","lim3","lim4","lim5").map { Parser.catalog(folder.resolve("$it.html").readText()) })
        assertEquals(279,latest.size)
        for((name,date) in listOf("current" to "2026-11-02","next" to "2026-11-09")) {
            val week=Parser.schedule(folder.resolve("tvl2d1-$name.html").readText(),"TVL2D1",latest)
            assertEquals(LocalDate.parse(date),week.weekStart)
            assertEquals("published",week.status)
            assertTrue(week.lessons.isNotEmpty())
        }
    }
    @Test fun allCapturedSchedulesMatchJavaScriptExactly() {
        for (f in raw.listFiles()!!.filter { it.name !in catalogNames && it.name != "pic.html" }.sortedBy { it.name }) {
            val actual = try {
                val w = week(f)
                listOf(strings(w.group,w.branch,w.weekStart,w.weekEnd,w.status,w.warnings.joinToString("|"),w.navigation["previous"],w.navigation["current"],w.navigation["next"])) + w.lessons.map { l ->
                    strings(l.date,l.startTime,l.endTime,l.subject,l.room,l.period,l.group,l.sourceGroup,l.subgroup,l.category,l.type,l.elective,l.requiresSelection,l.provisional,l.individualSchedule,l.deliveryModeUnspecified,l.changed,l.source,l.choiceKey)
                }
            } catch (e: ScheduleException) { listOf(strings("error",e.code)) }
            assertEquals(f.name, lines(f.name + ".golden"), actual)
        }
    }
    @Test fun stateBoundariesMatchCommonJavaScriptCases() {
        val weeks = raw.listFiles()!!.filter { it.name !in catalogNames && it.name != "pic.html" }.sortedBy { it.name }.map { week(it) }.filter { it.status == "published" }
        var cases = 0
        for (expected in lines("states.golden.gz")) {
            val (group, millis, choiceMode) = expected
            val choices = if (choiceMode == "all") weeks.filter { it.group == group }.flatMap { it.lessons }.filter { it.requiresSelection }.map { it.choiceKey }.toSet() else emptySet()
            val s = Engine.state(group,weeks,choices,Instant.ofEpochMilli(millis.toLong()),offline=true,stale=true)
            val actual = strings(group,millis,choiceMode,s.status,s.current?.choiceKey,s.next?.choiceKey,s.concurrent.size,s.selectionRequired,s.coverageIncomplete,s.offline,s.stale,s.issue,s.refreshAt.toEpochMilli())
            assertEquals("$group $millis $choiceMode", expected, actual); cases++
        }
        assertTrue(cases > 500)
    }
    @Test fun unicodeChoiceAndReminderIdentityMatchJavaScriptUtf16() {
        for (values in lines("identity.golden")) {
            assertEquals(values[1], Json.array(values[0],values[0]))
            assertEquals(values[2], ReminderIdentity.fingerprint(values[0]))
        }
    }
    @Test fun tiedLessonsUseTheSameDiacriticCollationAsJavaScript() {
        val expected=lines("collation.golden").map { it.single() }
        val original=week(File(raw,"tvl2d1-current.html"))
        val sample=original.lessons.first().copy(requiresSelection=false)
        val lessons=expected.reversed().map { sample.copy(subject=it) }
        val state=Engine.state(original.group,listOf(original.copy(lessons=lessons)),emptySet(),sample.start)
        assertEquals(expected,(listOf(state.current!!) + state.concurrent).map { it.subject })
    }
    @Test fun rigaGapsOverlapsAndCalendarBoundariesAreExplicit() {
        error("NONEXISTENT_LOCAL_TIME") { Riga.instant(LocalDate.parse("2026-03-29"),LocalTime.parse("03:30")) }
        error("AMBIGUOUS_LOCAL_TIME") { Riga.instant(LocalDate.parse("2026-10-25"),LocalTime.parse("03:30")) }
        val date = LocalDate.parse("2026-10-25"); val time = LocalTime.parse("03:30")
        assertEquals(3600,Duration.between(Riga.instant(date,time,Riga.Disambiguation.EARLIER),Riga.instant(date,time,Riga.Disambiguation.LATER)).seconds.toInt())
        val old = TimeZone.getDefault()
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Honolulu"))
            assertEquals(Instant.parse("2026-07-01T06:00:00Z"),Riga.instant(LocalDate.parse("2026-07-01"),LocalTime.parse("09:00")))
            assertEquals(LocalDate.parse("2026-11-02"),Riga.serverWeek(Instant.parse("2026-11-01T12:00:00Z")))
            assertEquals(LocalDate.parse("2026-12-28"),Riga.weekStart(LocalDate.parse("2027-01-01")))
        } finally { TimeZone.setDefault(old) }
    }
    @Test fun malformedAndChangedStructureNeverBecomeEmptySchedules() {
        val html = File(raw,"tvl2d1-current.html").readText()
        error("HTML_PARSE_ERROR") { Parser.schedule(html.dropLast(50),"TVL2D1",catalog()) }
        error("SOURCE_STRUCTURE_CHANGED") { Parser.schedule(html.replace("Auditorija","Room"),"TVL2D1",catalog()) }
        error("WEEK_MISMATCH") { Parser.schedule(html,"TVL2D1",catalog(),LocalDate.parse("2026-11-02")) }
        error("UNKNOWN_GROUP") { Parser.schedule(File(raw,"unknown-group.html").readText(),"NONEXISTENTPHASE0",catalog()) }
        error("HTML_PARSE_ERROR") { Parser.catalog(File(raw,"pic.html").readText()) }
        error("GROUP_MISMATCH") { Parser.schedule(html,"CSA1D1",catalog()) }
        val empty=html.replace(Regex("(<tbody class=\"content2\">)[\\s\\S]*?(</tbody>)"),"$1$2")
        val result=Parser.schedule(empty,"TVL2D1",catalog())
        assertEquals("emptyUnconfirmed",result.status)
        assertEquals("error",Engine.state("TVL2D1",listOf(result),emptySet(),Instant.parse("2026-10-26T08:00:00Z")).status)
    }
    @Test fun unsafeOriginsAndNegativeHistoricalRequestsAreRejected() {
        for (url in listOf("http://nodarbibas.turiba.lv/","https://nodarbibas.turiba.lv.evil.test/","https://evil@nodarbibas.turiba.lv/","https://nodarbibas.turiba.lv:444/","https://evil.test/nodarbibas.turiba.lv/")) error("UNSAFE_SOURCE") { SourceUrl.validate(url) }
        SourceUrl.validate(SourceUrl.schedule("TVL2D1",1))
        error("INVALID_WEEK") { SourceUrl.schedule("TVL2D1",-1) }
    }
    @Test fun capturedFixtureBytesRetainProvenanceHashes() {
        // Original manifest is JSON; extract only known filename/SHA pairs, not parse runtime data.
        val manifest = File(root,"tests/fixtures/manifest.json").readText()
        val entries = Regex("\"file\":\\s*\"([^\"]+)\"[\\s\\S]*?\"sha256\":\\s*\"([a-f0-9]{64})\"").findAll(manifest).toList()
        assertEquals(24,entries.size)
        for (m in entries) {
            val hash = MessageDigest.getInstance("SHA-256").digest(File(root,m.groupValues[1]).readBytes()).joinToString("") { "%02x".format(it) }
            assertEquals(m.groupValues[1],m.groupValues[2],hash)
        }
    }
}
