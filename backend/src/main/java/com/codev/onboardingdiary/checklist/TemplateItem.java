package com.codev.onboardingdiary.checklist;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One step of a checklist template; {@code dueDayOffset} counts days from the start date. */
@Embeddable
public class TemplateItem {

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 1000)
  private String description;

  @Column(name = "due_day_offset")
  private Integer dueDayOffset;

  protected TemplateItem() {}

  public TemplateItem(String title, String description, Integer dueDayOffset) {
    this.title = title;
    this.description = description;
    this.dueDayOffset = dueDayOffset;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public Integer getDueDayOffset() {
    return dueDayOffset;
  }
}
