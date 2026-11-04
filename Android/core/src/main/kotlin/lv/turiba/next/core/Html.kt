package lv.turiba.next.core

internal data class HtmlNode(val tag: String, val attrs: Map<String, String> = emptyMap(), val children: MutableList<Any> = mutableListOf()) {
    companion object {
        private val spaces=Regex("[\\s\\u00a0]+")
        private val classSpaces=Regex("\\s+")
    }
    fun all(test: (HtmlNode) -> Boolean): List<HtmlNode> = buildList {
        if (test(this@HtmlNode)) add(this@HtmlNode)
        children.filterIsInstance<HtmlNode>().forEach { addAll(it.all(test)) }
    }
    fun only(test: (HtmlNode) -> Boolean): HtmlNode = all(test).also { checkSource(it.size == 1) }.single()
    fun hasClass(name: String): Boolean = attrs["class"].orEmpty().split(classSpaces).contains(name)
    fun text(): String {
        fun collect(n: Any): String = if (n is String) n else (n as HtmlNode).let { if (it.tag == "br") " " else it.children.joinToString("") { c -> collect(c) } }
        return collect(this).replace(spaces, " ").trim()
    }
    fun cells(): List<HtmlNode> = children.filterIsInstance<HtmlNode>().filter { it.tag == "td" || it.tag == "th" }
}

internal object Html {
    private val void = setOf("area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr")
    private val entities = mapOf("nbsp" to " ", "amp" to "&", "lt" to "<", "gt" to ">", "quot" to "\"", "apos" to "'", "ndash" to "–", "mdash" to "—")
    private val entityPattern=Regex("&(#x[0-9a-f]+|#\\d+|[a-z]+);", RegexOption.IGNORE_CASE)
    private val comments=Regex("<!--[\\s\\S]*?-->")
    private val scripts=Regex("<(script|style)\\b[^>]*>[\\s\\S]*?</\\1\\s*>", RegexOption.IGNORE_CASE)
    private val tokens=Regex("<(?:(?:\"[^\"]*\"|'[^']*'|[^'\">])*)>|[^<]+|<")
    private val closingTag=Regex("^</\\s*([a-z][\\w:-]*)\\s*>$", RegexOption.IGNORE_CASE)
    private val openingTag=Regex("^<([a-z][\\w:-]*)\\b([\\s\\S]*?)/?\\s*>$", RegexOption.IGNORE_CASE)
    private val attribute=Regex("([\\w:-]+)(?:\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+)))?")
    private val selfClosing=Regex("/\\s*>$")
    fun decode(value: String): String = if('&' !in value) value else entityPattern.replace(value) { m ->
        val s = m.groupValues[1]
        if (!s.startsWith('#')) entities[s.lowercase()] ?: m.value else {
            val hex = s.startsWith("#x", true)
            val n = s.drop(if (hex) 2 else 1).toLongOrNull(if (hex) 16 else 10) ?: 0
            if (n in 1..0x10ffff && n !in 0xd800..0xdfff) String(Character.toChars(n.toInt())) else "�"
        }
    }
    fun parse(html: String): HtmlNode {
        checkSource(html.isNotEmpty() && html.length <= 2_000_000, "HTML_PARSE_ERROR")
        val clean = html.replace(comments, "").replace(scripts, "")
        val root = HtmlNode("root")
        val stack = mutableListOf(root)
        for (m in tokens.findAll(clean)) {
            val token = m.value
            val current = stack.last()
            if (!token.startsWith('<')) { current.children.add(decode(token)); continue }
            if (token.startsWith("<!")) continue
            checkSource(token != "<", "HTML_PARSE_ERROR")
            val closing = closingTag.matchEntire(token)
            if (closing != null) {
                checkSource(stack.size > 1 && current.tag == closing.groupValues[1].lowercase(), "HTML_PARSE_ERROR")
                stack.removeAt(stack.lastIndex); continue
            }
            val opening = openingTag.matchEntire(token)
                ?: throw ScheduleException("HTML_PARSE_ERROR")
            val attrs = mutableMapOf<String, String>()
            for (a in attribute.findAll(opening.groupValues[2])) {
                attrs[a.groupValues[1].lowercase()] = decode(a.groups[2]?.value ?: a.groups[3]?.value ?: a.groups[4]?.value ?: "")
            }
            val node = HtmlNode(opening.groupValues[1].lowercase(), attrs)
            current.children.add(node)
            if (node.tag !in void && !selfClosing.containsMatchIn(token)) stack.add(node)
            checkSource(stack.size <= 256, "HTML_PARSE_ERROR")
        }
        checkSource(stack.size == 1, "HTML_PARSE_ERROR")
        return root
    }
}
