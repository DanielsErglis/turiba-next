package lv.turiba.next.core

import java.net.URLDecoder
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle

object Parser {
    const val ORIGIN = "https://nodarbibas.turiba.lv/"
    val catalogPaths = listOf("", "?lim=1", "?lim=3", "?lim=4", "?lim=5")
    private val branches = mapOf("Rīga" to "riga", "Cēsis" to "cesis", "Liepāja" to "liepaja", "Talsi" to "talsi")
    private val sourceDate = DateTimeFormatter.ofPattern("dd.MM.uuuu").withResolverStyle(ResolverStyle.STRICT)
    private val groupLink=Regex("^pub_nod\\.asp\\?Grupa=([^&#]+)$",RegexOption.IGNORE_CASE)
    private val gridId=Regex("^laiks_[1-4]$")
    private val periodTime=Regex("^(\\d+)\\.\\s*(\\d{2}:\\d{2})\\s*-\\s*(\\d{2}:\\d{2})$")
    private val validClock=Regex("^(?:[01]\\d|2[0-3]):[0-5]\\d$")
    private val navigationLink=Regex("^\\?ned=-?\\d+$")
    private val headingPattern=Regex("^Grupa\\s+(\\S+)\\s+no\\s+(\\d{2}\\.\\d{2}\\.\\d{4})\\s+līdz\\s+(\\d{2}\\.\\d{2}\\.\\d{4})$")
    private val rowDate=Regex("(\\d{2}\\.\\d{2}\\.\\d{4})$")
    private val numberedPeriod=Regex("^(\\d+)\\.\\s*(.*)$")
    private val electivePattern=Regex("Izvēles studiju kursi|Study Courses by choice",RegexOption.IGNORE_CASE)
    private val individualPattern=Regex("(^|[^*])\\*(?!\\*)")
    private val provisionalPattern=Regex("(^|[^*])\\*{2}(?!\\*)")
    private val deliveryPattern=Regex("(^|[^*])\\*{3}(?!\\*)")
    private val examPattern=Regex("\\beksāmens\\b|\\bexam(?:ination)?\\b",RegexOption.IGNORE_CASE)
    private val consultationPattern=Regex("konsultācij|consultation",RegexOption.IGNORE_CASE)
    private val selfStudyPattern=Regex("self-dependent studies|patstāvīg",RegexOption.IGNORE_CASE)
    private val changedColor=Regex("^(red|#ff0000)$",RegexOption.IGNORE_CASE)
    private fun date(value: String): LocalDate = try { LocalDate.parse(value, sourceDate) } catch (_: Exception) { throw ScheduleException("HTML_PARSE_ERROR") }

    fun catalog(html: String): List<CatalogEntry> {
        val root = Html.parse(html)
        val result = mutableListOf<CatalogEntry>()
        for (table in root.all { it.tag == "table" }) {
            var columnBranches = emptyList<String>()
            for (row in table.all { it.tag == "tr" }) {
                val columns = row.cells()
                if (columns.isNotEmpty() && columns.all { it.text() in branches }) columnBranches = columns.map { branches.getValue(it.text()) }
                columns.forEachIndexed { index, cell ->
                    var branch: String? = columnBranches.getOrNull(index)
                    for (item in cell.all { it.tag == "p" || it.tag == "a" }) {
                        if (item.tag == "p" && item.text() in branches) branch = branches.getValue(item.text())
                        if (item.tag != "a") continue
                        val link = groupLink.matchEntire(item.attrs["href"].orEmpty()) ?: continue
                        val code = try { normalizeGroup(URLDecoder.decode(link.groupValues[1], "UTF-8")) } catch (_: Exception) { throw ScheduleException("SOURCE_STRUCTURE_CHANGED") }
                        checkSource(item.text().uppercase() == code && branch != null)
                        result.add(CatalogEntry(code, branch!!, ORIGIN + item.attrs.getValue("href")))
                    }
                }
            }
        }
        checkSource(result.isNotEmpty())
        return mergeCatalogs(listOf(result))
    }
    fun mergeCatalogs(catalogs: List<List<CatalogEntry>>): List<CatalogEntry> {
        val result = linkedMapOf<String, CatalogEntry>()
        for (item in catalogs.flatten()) {
            checkSource(result[item.code] == null || result[item.code]?.branch == item.branch)
            result.putIfAbsent(item.code, item)
        }
        return result.values.toList()
    }

    private fun grids(root: HtmlNode): Map<String, Map<String, Map<Int, Pair<LocalTime, LocalTime>>>> {
        val result = mutableMapOf<String, Map<String, Map<Int, Pair<LocalTime, LocalTime>>>>()
        for (section in root.all { gridId.matches(it.attrs["id"].orEmpty()) }) {
            val label = root.only { it.attrs["id"] == "fil_" + section.attrs.getValue("id").last() }
            val branch = branches[label.text()] ?: throw ScheduleException("SOURCE_STRUCTURE_CHANGED")
            var day: String? = null
            val grid = mutableMapOf<String, Map<Int, Pair<LocalTime, LocalTime>>>()
            for (element in section.all { it.hasClass("dienas") || it.tag == "ul" }) {
                if (element.hasClass("dienas")) {
                    day = when (element.text()) {
                        "Sestdiena" -> "saturday"
                        "Pirmdiena, Otrdiena, Trešdiena, Ceturtdiena, Piektdiena" -> "weekday"
                        else -> throw ScheduleException("SOURCE_STRUCTURE_CHANGED")
                    }
                } else {
                    checkSource(day != null && day !in grid)
                    val periods = mutableMapOf<Int, Pair<LocalTime, LocalTime>>()
                    for (item in element.all { it.tag == "li" }) {
                        val m = periodTime.matchEntire(item.text()) ?: throw ScheduleException("SOURCE_STRUCTURE_CHANGED")
                        val start = clock(m.groupValues[2]); val end = clock(m.groupValues[3]); val n = m.groupValues[1].toInt()
                        checkSource(start < end && n !in periods)
                        periods[n] = start to end
                    }
                    checkSource(periods.isNotEmpty())
                    grid[day!!] = periods
                }
            }
            checkSource(branch !in result)
            result[branch] = grid
        }
        return result
    }
    private fun clock(s: String): LocalTime {
        checkSource(validClock.matches(s))
        return LocalTime.parse(s)
    }
    private fun navigation(root: HtmlNode, group: String): Map<String, String> {
        val nav = root.only { it.hasClass("time_table_content_block_nav") }
        val result = linkedMapOf<String, String>()
        for (anchor in nav.all { it.tag == "a" }) {
            val key = when {
                anchor.hasClass("time_table_content_block_nav_left") -> "previous"
                anchor.hasClass("time_table_content_block_nav_right") -> "next"
                anchor.hasClass("time_table_content_block_nav_down") -> "current"
                else -> throw ScheduleException("SOURCE_STRUCTURE_CHANGED")
            }
            val href = anchor.attrs["href"].orEmpty()
            checkSource(navigationLink.matches(href) || href == "pub_nod.asp")
            result[key] = ORIGIN + "pub_nod.asp?Grupa=" + SourceUrl.encode(group) + if (href.startsWith('?')) "&" + href.drop(1) else ""
        }
        checkSource(result.keys.containsAll(listOf("previous", "next", "current")))
        return result
    }
    fun schedule(html: String, groupValue: String, catalog: List<CatalogEntry>, expectedWeek: LocalDate? = null,
                 sourceUrl: String? = null, catalogComplete: Boolean = true): Week {
        val group = normalizeGroup(groupValue)
        val root = Html.parse(html)
        val heading = root.only { it.tag == "h2" && it.text().startsWith("Grupa ") }
        val m = headingPattern.matchEntire(heading.text()) ?: throw ScheduleException("SOURCE_STRUCTURE_CHANGED")
        checkSource(m.groupValues[1].uppercase() == group, "GROUP_MISMATCH")
        val start = date(m.groupValues[2]); val end = date(m.groupValues[3])
        checkSource(start.dayOfWeek == DayOfWeek.MONDAY && end == start.plusDays(6))
        checkSource(expectedWeek == null || start == expectedWeek, "WEEK_MISMATCH")
        val nav = navigation(root, group)
        val entry = catalog.find { it.code == group }
        if (catalogComplete) checkSource(entry != null, "UNKNOWN_GROUP")
        val container = root.only { it.hasClass("classes_table") }
        val table = container.only { it.tag == "table" }
        val unavailable = table.all { it.hasClass("nav_public") }
        if (unavailable.isNotEmpty()) {
            checkSource(unavailable.size == 1 && unavailable.single().text() == "Atvainojiet, nodarbību saraksts šajā nedēļā nav publicēts")
            return Week(group, entry?.branch, start, end, if (entry != null) "unpublished" else "unverifiedGroup", nav, emptyList(), listOf("PUBLICATION_REASON_UNVERIFIED"))
        }
        checkSource(entry != null, "GROUP_UNVERIFIED")
        val header = table.only { it.tag == "tr" && it.hasClass("head2") }
        checkSource(header.cells().joinToString("|") { it.text() } == "Datums|Nodarbības|Grupa|Auditorija")
        val body = table.only { it.tag == "tbody" && it.hasClass("content2") }
        checkSource(body.children.all { if (it is String) it.isBlank() else (it as HtmlNode).tag == "tr" })
        checkSource(table.all { it.tag == "tr" }.size == body.all { it.tag == "tr" }.size + 1)
        val grids = grids(root)
        var date: LocalDate? = null; var period: Int? = null; var category: String? = null
        val warnings = linkedSetOf<String>(); val lessons = mutableListOf<Lesson>()
        for (row in body.children.filterIsInstance<HtmlNode>()) {
            val columns = row.cells()
            checkSource(columns.size in 4..5 && columns.all { "rowspan" !in it.attrs })
            val dt = columns[0].text()
            if (dt.isNotEmpty()) {
                val dm = rowDate.find(dt) ?: throw ScheduleException("HTML_PARSE_ERROR")
                date = date(dm.value); period = null; category = null
            }
            checkSource(date != null && date >= start && date <= end, "HTML_PARSE_ERROR")
            val numbered = columns[1].text()
            if (numbered.isNotEmpty()) {
                val nm = numberedPeriod.matchEntire(numbered) ?: throw ScheduleException("HTML_PARSE_ERROR")
                period = nm.groupValues[1].toInt(); category = nm.groupValues[2]
            }
            if (columns.size == 4) {
                checkSource(columns[1].attrs["colspan"] == "2")
                if (numbered.isEmpty()) { checkSource(columns[1].hasClass("color_2"), "HTML_PARSE_ERROR"); warnings.add("BLANK_SERVICE_ROW"); continue }
            } else checkSource(columns.all { it.attrs["colspan"] == null || it.attrs["colspan"] == "1" })
            checkSource(period != null && period > 0 && category != null, "HTML_PARSE_ERROR")
            val subject = if (columns.size == 5) columns[2].text() else category!!
            val sourceGroup = columns[columns.size - 2].text(); val room = columns.last().text().ifEmpty { null }
            checkSource(subject.isNotEmpty() && sourceGroup.isNotEmpty(), "HTML_PARSE_ERROR")
            val kind = when (date!!.dayOfWeek) { DayOfWeek.SATURDAY -> "saturday"; DayOfWeek.SUNDAY -> "sunday"; else -> "weekday" }
            val times = grids[entry!!.branch]?.get(kind)?.get(period) ?: throw ScheduleException("TIME_GRID_MISSING")
            val elective = electivePattern.containsMatchIn(category!!)
            val subgroup = sourceGroup.takeIf { it != group }
            val annotation = "$category $subject"
            val individual = individualPattern.containsMatchIn(annotation)
            val type = when {
                examPattern.containsMatchIn(subject) -> "exam"
                consultationPattern.containsMatchIn(subject) -> "consultation"
                selfStudyPattern.containsMatchIn(subject) -> "selfStudy"
                else -> "lesson"
            }
            lessons.add(Lesson(date, times.first, times.second, subject, room, period!!, group, sourceGroup, subgroup, category, type, elective,
                elective || subgroup != null || individual, provisionalPattern.containsMatchIn(annotation), individual,
                deliveryPattern.containsMatchIn(annotation), row.all { it.tag == "font" && changedColor.matches(it.attrs["color"].orEmpty()) }.isNotEmpty(), sourceUrl ?: nav.getValue("current")))
            if (room == null) warnings.add("MISSING_ROOM")
        }
        if (lessons.isEmpty()) warnings.add("EMPTY_PUBLICATION_UNCONFIRMED")
        return Week(group, entry!!.branch, start, end, if (lessons.isEmpty()) "emptyUnconfirmed" else "published", nav, lessons, warnings.toList())
    }
}
