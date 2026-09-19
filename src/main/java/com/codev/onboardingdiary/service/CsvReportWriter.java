package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.Task;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;

@Component
public class CsvReportWriter {

    public byte[] write(ReportData data) {
        StringBuilder csv = new StringBuilder();
        csv.append("Onboarding diary report\n");
        csv.append("User,").append(escape(data.userName())).append(',').append(escape(data.userEmail())).append('\n');
        csv.append("Range,").append(data.from()).append(',').append(data.to()).append('\n');
        csv.append("Type,").append(data.type().name()).append('\n');

        if (data.type().includesTasks()) {
            csv.append('\n').append("TASKS\n");
            csv.append("Date,Title,Category,Status,Priority,Description\n");
            for (Task task : data.tasks()) {
                csv.append(task.getDate()).append(',')
                        .append(escape(task.getTitle())).append(',')
                        .append(escape(task.getCategory())).append(',')
                        .append(task.getStatus()).append(',')
                        .append(task.getPriority()).append(',')
                        .append(escape(task.getDescription())).append('\n');
            }
        }
        if (data.type().includesIssues()) {
            csv.append('\n').append("ISSUES\n");
            csv.append("Date,Title,Severity,Status,Description,Resolution notes\n");
            for (Issue issue : data.issues()) {
                csv.append(issue.getDate()).append(',')
                        .append(escape(issue.getTitle())).append(',')
                        .append(issue.getSeverity()).append(',')
                        .append(issue.getStatus()).append(',')
                        .append(escape(issue.getDescription())).append(',')
                        .append(escape(issue.getResolutionNotes())).append('\n');
            }
        }
        if (data.type().includesFeedback()) {
            csv.append('\n').append("FEEDBACK\n");
            csv.append("Date,Subject,Type,Details\n");
            for (Feedback feedback : data.feedback()) {
                csv.append(feedback.getDate()).append(',')
                        .append(escape(feedback.getSubject())).append(',')
                        .append(feedback.getType()).append(',')
                        .append(escape(feedback.getDetails())).append('\n');
            }
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** RFC 4180 quoting: wrap in quotes and double any embedded quote. */
    static String escape(String value) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replace("\r\n", " ").replace('\n', ' ').replace('\r', ' ');
        return '"' + cleaned.replace("\"", "\"\"") + '"';
    }
}
