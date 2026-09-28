package com.onboardingdiary.report

import com.onboardingdiary.report.ReportFixtures.document
import com.onboardingdiary.report.ReportFixtures.feedback
import com.onboardingdiary.report.ReportFixtures.issue
import com.onboardingdiary.report.ReportFixtures.task
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PdfRendererTest {

    private val renderer = PdfRenderer()

    private fun text(bytes: ByteArray): Pair<Int, String> = Loader.loadPDF(bytes).use { pdf ->
        pdf.numberOfPages to PDFTextStripper().getText(pdf)
    }

    @Test
    fun `produces a loadable PDF with header text and one section per type`() {
        val bytes = renderer.render(
            document(
                ReportType.COMBINED,
                tasks = listOf(task("Set up laptop", "Install IDE")),
                issues = listOf(issue("VPN broken", notes = "Reissued cert")),
                feedback = listOf(feedback("Great start", "Keep going")),
            ),
        )
        assertEquals("%PDF-", bytes.copyOfRange(0, 5).toString(Charsets.US_ASCII))
        val (pages, text) = text(bytes)
        assertTrue(pages > 0)
        assertTrue(text.contains("Onboarding report"))
        assertTrue(text.contains("Ada Lovelace"))
        assertTrue(text.contains("2026-01-01 to 2026-01-31"))
        assertTrue(text.contains("Tasks (1)") && text.contains("Set up laptop") && text.contains("Install IDE"))
        assertTrue(text.contains("Issues (1)") && text.contains("VPN broken") && text.contains("Resolution: Reissued cert"))
        assertTrue(text.contains("Feedback (1)") && text.contains("Great start"))
        assertFalse(text.contains(ReportDocument.NO_ENTRIES))
    }

    @Test
    fun `empty range states No entries in range`() {
        val (pages, text) = text(renderer.render(document(ReportType.TASKS)))
        assertEquals(1, pages)
        assertTrue(text.contains(ReportDocument.NO_ENTRIES))
    }

    @Test
    fun `long content wraps and paginates`() {
        val tasks = (1..120).map { task("Task $it", "word ".repeat(60)) }
        val (pages, text) = text(renderer.render(document(ReportType.TASKS, tasks = tasks)))
        assertTrue(pages > 1)
        assertTrue(text.contains("Task 120"))
    }

    @Test
    fun `unbroken words wider than the page are split instead of clipped`() {
        val long = "x".repeat(400)
        val (_, text) = text(renderer.render(document(ReportType.TASKS, tasks = listOf(task("Long", long)))))
        val lines = text.lines().filter { it.isNotBlank() && it.all { c -> c == 'x' } }
        assertTrue(lines.size > 1)
        assertTrue(lines.all { it.length < 200 })
        assertTrue(lines.sumOf { it.length } == 400)
    }

    @Test
    fun `omitted feedback is noted and unencodable characters do not crash`() {
        val doc = document(ReportType.COMBINED, feedback = null, feedbackOmitted = true, tasks = listOf(task("Emoji 🎉\ttab")))
        val (_, text) = text(renderer.render(doc))
        assertTrue(text.contains("Feedback omitted"))
        assertTrue(text.contains("Emoji ? tab"))
    }
}
