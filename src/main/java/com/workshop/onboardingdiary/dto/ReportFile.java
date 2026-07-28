package com.workshop.onboardingdiary.dto;

/** A rendered report ready to be streamed as a file download (REQUIREMENTS 4.7). */
public record ReportFile(String filename, String contentType, byte[] content) {
}
