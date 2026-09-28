package com.onboardingdiary.report

import com.onboardingdiary.feedback.FeedbackNote
import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.task.TaskEntry
import org.springframework.stereotype.Component

/**
 * RFC 4180 CSV, UTF-8, CRLF line endings, header row first (REQ-FUNC-082).
 * A field is quoted when it contains a comma, a double quote or a line break;
 * embedded quotes are doubled. `COMBINED` prefixes every row with a `kind`
 * column and uses the union of the per-type columns. An empty range yields the
 * header plus one row whose first data cell reads "No entries in range".
 */
@Component
class CsvRenderer : ReportRenderer {

    override val format = ReportFormat.CSV

    override fun render(document: ReportDocument): ByteArray {
        val rows = when (document.type) {
            ReportType.TASKS -> listOf(TASK_HEADER) + document.tasks.orEmpty().map(::taskRow)
            ReportType.ISSUES -> listOf(ISSUE_HEADER) + document.issues.orEmpty().map(::issueRow)
            ReportType.FEEDBACK -> listOf(FEEDBACK_HEADER) + document.feedback.orEmpty().map(::feedbackRow)
            ReportType.COMBINED -> combined(document)
        }
        val header = rows.first()
        val body = if (rows.size == 1) listOf(header, padded(header.size, ReportDocument.NO_ENTRIES)) else rows
        return body.joinToString("\r\n", postfix = "\r\n") { line(it) }.toByteArray(Charsets.UTF_8)
    }

    private fun combined(document: ReportDocument): List<List<String>> {
        val entries = buildList<Pair<java.time.LocalDate, List<String>>> {
            document.tasks.orEmpty().forEach { add(it.entryDate to combinedTask(it)) }
            document.issues.orEmpty().forEach { add(it.entryDate to combinedIssue(it)) }
            document.feedback.orEmpty().forEach { add(it.entryDate to combinedFeedback(it)) }
        }.sortedBy { it.first }.map { it.second }
        return listOf(COMBINED_HEADER) + entries
    }

    private fun taskRow(t: TaskEntry) =
        listOf(t.entryDate.toString(), t.title, t.category.name, t.status.name, t.priority.name, t.description.orEmpty())

    private fun issueRow(i: IssueEntry) =
        listOf(i.entryDate.toString(), i.title, i.severity.name, i.status.name, i.description.orEmpty(), i.resolutionNotes.orEmpty())

    private fun feedbackRow(f: FeedbackNote) = listOf(f.entryDate.toString(), f.subject, f.type.name, f.details)

    // kind,entryDate,title,category,status,priority,severity,type,description,resolutionNotes
    private fun combinedTask(t: TaskEntry) =
        listOf("TASK", t.entryDate.toString(), t.title, t.category.name, t.status.name, t.priority.name, "", "", t.description.orEmpty(), "")

    private fun combinedIssue(i: IssueEntry) =
        listOf("ISSUE", i.entryDate.toString(), i.title, "", i.status.name, "", i.severity.name, "", i.description.orEmpty(), i.resolutionNotes.orEmpty())

    private fun combinedFeedback(f: FeedbackNote) =
        listOf("FEEDBACK", f.entryDate.toString(), f.subject, "", "", "", "", f.type.name, f.details, "")

    private fun padded(width: Int, first: String) = List(width) { if (it == 0) first else "" }

    private fun line(fields: List<String>) = fields.joinToString(",") { escape(it) }

    companion object {
        val TASK_HEADER = listOf("entryDate", "title", "category", "status", "priority", "description")
        val ISSUE_HEADER = listOf("entryDate", "title", "severity", "status", "description", "resolutionNotes")
        val FEEDBACK_HEADER = listOf("entryDate", "subject", "type", "details")
        val COMBINED_HEADER =
            listOf("kind", "entryDate", "title", "category", "status", "priority", "severity", "type", "description", "resolutionNotes")

        fun escape(field: String): String =
            if (field.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) "\"" + field.replace("\"", "\"\"") + "\"" else field
    }
}
