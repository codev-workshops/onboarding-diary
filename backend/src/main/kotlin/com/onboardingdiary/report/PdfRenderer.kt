package com.onboardingdiary.report

import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.common.PDRectangle
import org.apache.pdfbox.pdmodel.font.PDFont
import org.apache.pdfbox.pdmodel.font.PDType1Font
import org.apache.pdfbox.pdmodel.font.Standard14Fonts
import org.springframework.stereotype.Component
import java.io.ByteArrayOutputStream
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * PDF report (REQ-FUNC-081) via Apache PDFBox: a title block, then one titled
 * section per included report type with one paragraph per entry. Long lines
 * wrap and pages break automatically. An empty range renders
 * "No entries in range" under the title. Blocking — run under `Dispatchers.IO`.
 */
@Component
class PdfRenderer : ReportRenderer {

    override val format = ReportFormat.PDF

    override fun render(document: ReportDocument): ByteArray {
        PDDocument().use { pdf ->
            val writer = Writer(pdf)
            writer.line("Onboarding report", TITLE, TITLE_SIZE)
            writer.line("Recruit: ${document.recruit.fullName} <${document.recruit.email}>", BODY, BODY_SIZE)
            writer.line("Period: ${document.range.from} to ${document.range.to}", BODY, BODY_SIZE)
            writer.line("Type: ${document.type.name}    Generated: ${GENERATED_AT.format(document.generatedAt)}", BODY, BODY_SIZE)
            if (document.feedbackOmitted) writer.line("Feedback omitted (not visible to the requesting user).", BODY, BODY_SIZE)
            writer.gap()

            if (document.isEmpty) {
                writer.line(ReportDocument.NO_ENTRIES, BODY, BODY_SIZE)
            } else {
                document.tasks?.let { tasks ->
                    writer.section("Tasks (${tasks.size})")
                    tasks.forEach { t ->
                        writer.entry(
                            "${t.entryDate}  ${t.title}",
                            listOf("Category: ${t.category}  Status: ${t.status}  Priority: ${t.priority}") + listOfNotNull(t.description),
                        )
                    }
                }
                document.issues?.let { issues ->
                    writer.section("Issues (${issues.size})")
                    issues.forEach { i ->
                        writer.entry(
                            "${i.entryDate}  ${i.title}",
                            listOf("Severity: ${i.severity}  Status: ${i.status}") +
                                listOfNotNull(i.description, i.resolutionNotes?.let { "Resolution: $it" }),
                        )
                    }
                }
                document.feedback?.let { notes ->
                    writer.section("Feedback (${notes.size})")
                    notes.forEach { f -> writer.entry("${f.entryDate}  ${f.subject}", listOf("Type: ${f.type}", f.details)) }
                }
            }
            writer.close()
            return ByteArrayOutputStream().also { pdf.save(it) }.toByteArray()
        }
    }

    private class Writer(private val pdf: PDDocument) {
        private var page: PDPage = newPage()
        private var content = PDPageContentStream(pdf, page)
        private var y = TOP

        fun line(text: String, font: PDFont, size: Float) {
            for (chunk in wrap(sanitize(text), font, size)) {
                ensureRoom(size * LEADING)
                content.beginText()
                content.setFont(font, size)
                content.newLineAtOffset(MARGIN, y)
                content.showText(chunk)
                content.endText()
                y -= size * LEADING
            }
        }

        fun gap(points: Float = BODY_SIZE) {
            y -= points
        }

        fun section(title: String) {
            gap(BODY_SIZE / 2)
            line(title, TITLE, SECTION_SIZE)
            gap(BODY_SIZE / 2)
        }

        fun entry(heading: String, body: List<String>) {
            line(heading, TITLE, BODY_SIZE)
            body.forEach { line(it, BODY, BODY_SIZE) }
            gap(BODY_SIZE / 2)
        }

        fun close() = content.close()

        private fun ensureRoom(height: Float) {
            if (y - height < MARGIN) {
                content.close()
                page = newPage()
                content = PDPageContentStream(pdf, page)
                y = TOP
            }
        }

        private fun newPage() = PDPage(PDRectangle.A4).also { pdf.addPage(it) }

        private fun wrap(text: String, font: PDFont, size: Float): List<String> {
            val maxWidth = PDRectangle.A4.width - 2 * MARGIN
            val out = mutableListOf<String>()
            for (paragraph in text.split('\n')) {
                var current = StringBuilder()
                for (word in paragraph.split(' ')) {
                    val candidate = if (current.isEmpty()) word else "$current $word"
                    if (width(candidate, font, size) <= maxWidth || current.isEmpty()) {
                        current = StringBuilder(candidate)
                    } else {
                        out += current.toString()
                        current = StringBuilder(word)
                    }
                }
                out += current.toString()
            }
            return out
        }

        private fun width(s: String, font: PDFont, size: Float) = font.getStringWidth(s) / 1000 * size

        /** Standard-14 fonts are WinAnsi-only; drop control chars and replace unencodable glyphs. */
        private fun sanitize(text: String): String = buildString {
            text.replace("\r\n", "\n").replace('\r', '\n').replace('\t', ' ').codePoints().forEach { cp ->
                val s = Character.toString(cp)
                when {
                    cp == '\n'.code -> append('\n')
                    cp < 0x20 -> Unit
                    encodable(s) -> append(s)
                    else -> append('?')
                }
            }
        }

        private fun encodable(s: String) = try {
            BODY.encode(s); true
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    companion object {
        private val TITLE: PDFont = PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
        private val BODY: PDFont = PDType1Font(Standard14Fonts.FontName.HELVETICA)
        private const val TITLE_SIZE = 18f
        private const val SECTION_SIZE = 14f
        private const val BODY_SIZE = 10f
        private const val LEADING = 1.4f
        private const val MARGIN = 50f
        private val TOP = PDRectangle.A4.height - MARGIN
        private val GENERATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC)
    }
}
