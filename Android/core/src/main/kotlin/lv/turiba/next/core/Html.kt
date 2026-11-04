package lv.turiba.next.core

internal data class HtmlNode(val tag: String, val attrs: Map<String, String> = emptyMap(), val children: MutableList<Any> = mutableListOf()) {
    fun all(test: (HtmlNode) -> Boolean): List<HtmlNode> = buildList {
        if (test(this@HtmlNode)) add(this@HtmlNode)
        children.filterIsInstance<HtmlNode>().forEach { addAll(it.all(test)) }
    }
    fun only(test: (HtmlNode) -> Boolean): HtmlNode = all(test).also { checkSource(it.size == 1) }.single()
    fun hasClass(name: String): Boolean = attrs["class"].orEmpty().split(Regex("\\s+")).contains(name)
    fun text(): String {
        fun collect(n: Any): String = if (n is String) n else (n as HtmlNode).let { if (it.tag == "br") " " else it.children.joinToString("") { c -> collect(c) } }
        return collect(this).replace(Regex("[\\s\\u00a0]+"), " ").trim()
    }
    fun cells(): List<HtmlNode> = children.filterIsInstance<HtmlNode>().filter { it.tag == "td" || it.tag == "th" }
}

internal object Html {
    private val void = setOf("area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr")
    private val entities = mapOf("nbsp" to " ", "amp" to "&", "lt" to "<", "gt" to ">", "quot" to "\"", "apos" to "'", "ndash" to "–", "mdash" to "—")
    fun decode(value: String): String = Regex("&(#x[0-9a-f]+|#\\d+|[a-z]+);", RegexOption.IGNORE_CASE).replace(value) { m ->
        val s = m.groupValues[1]
        if (!s.startsWith('#')) entities[s.lowercase()] ?: m.value else {
            val hex = s.startsWith("#x", true)
            val n = s.drop(if (hex) 2 else 1).toLongOrNull(if (hex) 16 else 10) ?: 0
            if (n in 1..0x10ffff && n !in 0xd800..0xdfff) String(Character.toChars(n.toInt())) else "�"
        }
    }
    fun parse(html: String): HtmlNode {
        checkSource(html.isNotEmpty() && html.length <= 2_000_000, "HTML_PARSE_ERROR")
        val clean = html.replace(Regex("<!--[\\s\\S]*?-->"), "")
            .replace(Regex("<(script|style)\\b[^>]*>[\\s\\S]*?</\\1\\s*>", RegexOption.IGNORE_CASE), "")
        val root = HtmlNode("root")
        val stack = mutableListOf(root)
        for (m in Regex("<(?:(?:\"[^\"]*\"|'[^']*'|[^'\">])*)>|[^<]+|<").findAll(clean)) {
            val token = m.value
            val current = stack.last()
            if (!token.startsWith('<')) { current.children.add(decode(token)); continue }
            if (token.startsWith("<!")) continue
            checkSource(token != "<", "HTML_PARSE_ERROR")
            val closing = Regex("^</\\s*([a-z][\\w:-]*)\\s*>$", RegexOption.IGNORE_CASE).matchEntire(token)
            if (closing != null) {
                checkSource(stack.size > 1 && current.tag == closing.groupValues[1].lowercase(), "HTML_PARSE_ERROR")
                stack.removeAt(stack.lastIndex); continue
            }
            val opening = Regex("^<([a-z][\\w:-]*)\\b([\\s\\S]*?)/?\\s*>$", RegexOption.IGNORE_CASE).matchEntire(token)
                ?: throw ScheduleException("HTML_PARSE_ERROR")
            val attrs = mutableMapOf<String, String>()
            val pattern = Regex("([\\w:-]+)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+)))?")
            for (a in pattern.findAll(opening.groupValues[2])) {
                attrs[a.groupValues[1].lowercase()] = decode(a.groups[2]?.value ?: a.groups[3]?.value ?: a.groups[4]?.value ?: "")
            }
            val node = HtmlNode(opening.groupValues[1].lowercase(), attrs)
            current.children.add(node)
            if (node.tag !in void && !Regex("/\\s*>$").containsMatchIn(token)) stack.add(node)
            checkSource(stack.size <= 256, "HTML_PARSE_ERROR")
        }
        checkSource(stack.size == 1, "HTML_PARSE_ERROR")
        return root
    }
}
