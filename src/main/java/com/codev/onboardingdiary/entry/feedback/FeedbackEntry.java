package com.codev.onboardingdiary.entry.feedback;

import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** Feedback the recruit gives about their onboarding. */
@Entity
@Table(name = "feedback_entries")
public class FeedbackEntry extends EntryBase {

  @Column(nullable = false, length = 120)
  private String subject;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private FeedbackType type;

  @Column(nullable = false, length = 4000)
  private String details;

  protected FeedbackEntry() {}

  public FeedbackEntry(User owner) {
    super(owner);
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public FeedbackType getType() {
    return type;
  }

  public void setType(FeedbackType type) {
    this.type = type;
  }

  public String getDetails() {
    return details;
  }

  public void setDetails(String details) {
    this.details = details;
  }
}
