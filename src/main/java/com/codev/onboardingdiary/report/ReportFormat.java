package com.codev.onboardingdiary.report;

import org.springframework.http.MediaType;

/** Downloadable report formats. */
public enum ReportFormat {
  CSV("csv", new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8)),
  PDF("pdf", MediaType.APPLICATION_PDF);

  private final String extension;
  private final MediaType mediaType;

  ReportFormat(String extension, MediaType mediaType) {
    this.extension = extension;
    this.mediaType = mediaType;
  }

  public String extension() {
    return extension;
  }

  public MediaType mediaType() {
    return mediaType;
  }
}
