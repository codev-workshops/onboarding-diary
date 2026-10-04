package com.codev.onboardingdiary.feedback;

import com.codev.onboardingdiary.diary.DiaryEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "feedback")
public class Feedback extends DiaryEntry {

  @Column(nullable = false, length = 150)
  private String subject;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private FeedbackType type;

  @Column(nullable = false, length = 5000)
  private String details;

  protected Feedback() {}

  public Feedback(Long ownerId) {
    super(ownerId);
  }

  public void update(LocalDate entryDate, String subject, FeedbackType type, String details) {
    setEntryDate(entryDate);
    this.subject = subject;
    this.type = type;
    this.details = details;
  }

  public String getSubject() {
    return subject;
  }

  public FeedbackType getType() {
    return type;
  }

  public String getDetails() {
    return details;
  }
}
