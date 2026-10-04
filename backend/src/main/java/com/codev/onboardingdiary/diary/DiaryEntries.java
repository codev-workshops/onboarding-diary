package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.feedback.FeedbackRepository;
import com.codev.onboardingdiary.issue.IssueRepository;
import com.codev.onboardingdiary.note.NoteRepository;
import com.codev.onboardingdiary.task.TaskRepository;
import org.springframework.stereotype.Component;

/** Cross-log queries about a user's diary. */
@Component
public class DiaryEntries {

  private final TaskRepository taskRepository;
  private final IssueRepository issueRepository;
  private final FeedbackRepository feedbackRepository;
  private final NoteRepository noteRepository;

  public DiaryEntries(
      TaskRepository taskRepository,
      IssueRepository issueRepository,
      FeedbackRepository feedbackRepository,
      NoteRepository noteRepository) {
    this.taskRepository = taskRepository;
    this.issueRepository = issueRepository;
    this.feedbackRepository = feedbackRepository;
    this.noteRepository = noteRepository;
  }

  public boolean existFor(Long ownerId) {
    return taskRepository.existsByOwnerId(ownerId)
        || issueRepository.existsByOwnerId(ownerId)
        || feedbackRepository.existsByOwnerId(ownerId)
        || noteRepository.existsByOwnerId(ownerId);
  }
}
