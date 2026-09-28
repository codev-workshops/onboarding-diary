package com.onboardingdiary.report

import com.onboardingdiary.report.ReportFixtures.document
import com.onboardingdiary.report.ReportFixtures.feedback
import com.onboardingdiary.report.ReportFixtures.issue
import com.onboardingdiary.report.ReportFixtures.task
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CsvRendererTest {

    private val renderer = CsvRenderer()

    private fun lines(doc: ReportDocument): List<String> {
        val text = renderer.render(doc).toString(Charsets.UTF_8)
        assertTrue(text.endsWith("\r\n"), "CRLF-terminated")
        return text.removeSuffix("\r\n").split("\r\n")
    }

    @Test
    fun `fields containing commas, quotes and newlines are quoted per RFC 4180`() {
        assertEquals("plain", CsvRenderer.escape("plain"))
        assertEquals("\"a,b\"", CsvRenderer.escape("a,b"))
        assertEquals("\"say \"\"hi\"\"\"", CsvRenderer.escape("say \"hi\""))
        assertEquals("\"line1\nline2\"", CsvRenderer.escape("line1\nline2"))
        assertEquals("\"x\r\ny\"", CsvRenderer.escape("x\r\ny"))

        val doc = document(ReportType.TASKS, tasks = listOf(task("Read, then \"write\"", "multi\nline")))
        val out = lines(doc)
        assertEquals("entryDate,title,category,status,priority,description", out[0])
        assertEquals("2026-01-05,\"Read, then \"\"write\"\"\",TRAINING,TODO,MEDIUM,\"multi\nline\"", out[1])
    }

    @Test
    fun `output is UTF-8`() {
        val bytes = renderer.render(document(ReportType.FEEDBACK, feedback = listOf(feedback("Ünïcödé ✓"))))
        assertTrue(bytes.toString(Charsets.UTF_8).contains("Ünïcödé ✓"))
    }

    @Test
    fun `per-type reports have a header and one row per entry`() {
        assertEquals(3, lines(document(ReportType.TASKS, tasks = listOf(task("a"), task("b")))).size)
        assertEquals("entryDate,title,severity,status,description,resolutionNotes", lines(document(ReportType.ISSUES, issues = listOf(issue("i"))))[0])
        assertEquals("2026-01-15,f,POSITIVE,details", lines(document(ReportType.FEEDBACK, feedback = listOf(feedback("f"))))[1])
    }

    @Test
    fun `COMBINED has a leading kind column and is ordered by entryDate`() {
        val doc = document(
            ReportType.COMBINED,
            tasks = listOf(task("t", date = "2026-01-20")),
            issues = listOf(issue("i", notes = "fixed", date = "2026-01-02")),
            feedback = listOf(feedback("f", date = "2026-01-10")),
        )
        val out = lines(doc)
        assertEquals("kind,entryDate,title,category,status,priority,severity,type,description,resolutionNotes", out[0])
        assertEquals(listOf("ISSUE", "FEEDBACK", "TASK"), out.drop(1).map { it.substringBefore(',') })
        assertEquals("ISSUE,2026-01-02,i,,OPEN,,HIGH,,,fixed", out[1])
        assertEquals("FEEDBACK,2026-01-10,f,,,,,POSITIVE,details,", out[2])
        assertEquals("TASK,2026-01-20,t,TRAINING,TODO,MEDIUM,,,,", out[3])
    }

    @Test
    fun `empty range yields header plus a No entries in range row`() {
        for (type in ReportType.entries) {
            val out = lines(document(type))
            assertEquals(2, out.size, type.name)
            assertTrue(out[1].startsWith(ReportDocument.NO_ENTRIES), type.name)
            assertEquals(out[0].count { it == ',' }, out[1].count { it == ',' }, "same column count for ${type.name}")
        }
    }
}
