package com.codev.onboardingdiary.support;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Request bodies for creating diary entries in tests. */
public final class DiaryFixtures {

  private DiaryFixtures() {}

  public static Map<String, Object> task(String title, String status, LocalDate date) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", date.toString());
    body.put("title", title);
    body.put("category", "SETUP");
    body.put("status", status);
    body.put("priority", "MEDIUM");
    return body;
  }

  public static Map<String, Object> issue(String title, String severity, LocalDate date) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", date.toString());
    body.put("title", title);
    body.put("severity", severity);
    return body;
  }

  public static Map<String, Object> feedback(String subject, String type, LocalDate date) {
    return Map.of(
        "entryDate", date.toString(), "subject", subject, "type", type, "details", "Details");
  }

  public static Map<String, Object> note(String title, boolean shared, LocalDate date) {
    return Map.of(
        "entryDate",
        date.toString(),
        "title",
        title,
        "content",
        "Content",
        "tags",
        List.of(),
        "shared",
        shared);
  }
}
