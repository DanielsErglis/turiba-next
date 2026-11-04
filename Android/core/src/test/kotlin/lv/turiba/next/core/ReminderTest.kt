package lv.turiba.next.core

import org.junit.Test
import org.junit.Assert.*
import java.io.File
import java.time.Instant
import java.util.Base64
import java.util.zip.GZIPInputStream

class ReminderTest {
    private val root=File(System.getProperty("repositoryRoot"))
    private val raw=File(root,"tests/fixtures/raw")
    private fun week(group: String): Week {
        val catalog=Parser.mergeCatalogs(listOf("home.html","college.html","masters.html","doctoral.html","branches.html").map { Parser.catalog(File(raw,it).readText()) })
        return Parser.schedule(File(raw,group.lowercase()+"-current.html").readText(),group,catalog)
    }
    @Test fun allLeadLanguageAndChoicePlansMatchJavaScriptExactly() {
        val lines=GZIPInputStream(File(root,"Android/core/src/test/resources/parity/reminders.golden.gz").inputStream()).bufferedReader().use { it.readLines() }
        assertEquals(48,lines.size)
        for(line in lines) {
            val values=line.split('\t').map { String(Base64.getDecoder().decode(it),Charsets.UTF_8) }
            val group=values[0];val lead=values[1].toInt();val language=values[2];val mode=values[3]
            val week=week(group)
            val choices=if(mode=="all") week.lessons.filter { it.requiresSelection }.map { it.choiceKey }.toSet() else emptySet()
            val noRoom=when(language) {"lv"->"Auditorija nav norādīta";"ru"->"Аудитория не указана";else->"Room not provided"}
            val actual=Reminders.plan(true,group,choices,listOf(week),Instant.parse("2026-10-26T00:00:00Z"),lead,language,noRoom)
                .map { Json.array(it.id,it.trigger.toEpochMilli().toString(),it.body,it.fingerprint,it.weekStart) }
            assertEquals("$group/$lead/$language/$mode",values.drop(4),actual)
        }
    }
    @Test fun offIsAnEarlyExitAndProvisionalLessonsNeverPlan() {
        assertTrue(Reminders.plan(false,"TVL2D1",emptySet(),emptyList(),Instant.EPOCH,0,"en","Room not specified").isEmpty())
        val week=week("TVL2D1")
        val provisional=week.copy(lessons=week.lessons.map { it.copy(provisional=true) })
        assertTrue(Reminders.plan(true,"TVL2D1",provisional.lessons.map { it.choiceKey }.toSet(),listOf(provisional),Instant.parse("2026-10-26T00:00:00Z"),10,"en","Room not specified").isEmpty())
    }
}
