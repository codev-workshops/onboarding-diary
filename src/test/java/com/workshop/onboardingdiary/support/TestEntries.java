package com.workshop.onboardingdiary.support;

import com.workshop.onboardingdiary.entity.AdditionalNote;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.ManagerAssignment;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskPriority;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.ManagerAssignmentRepository;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Seeds entries and manager assignments directly through the repositories. */
@Component
public class TestEntries {

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final TaskCategoryRepository taskCategoryRepository;
    private final ManagerAssignmentRepository managerAssignmentRepository;
    private final FeedbackNoteRepository feedbackNoteRepository;
    private final AdditionalNoteRepository additionalNoteRepository;

    public TestEntries(TaskEntryRepository taskEntryRepository,
                       IssueEntryRepository issueEntryRepository,
                       TaskCategoryRepository taskCategoryRepository,
                       ManagerAssignmentRepository managerAssignmentRepository,
                       FeedbackNoteRepository feedbackNoteRepository,
                       AdditionalNoteRepository additionalNoteRepository) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.taskCategoryRepository = taskCategoryRepository;
        this.managerAssignmentRepository = managerAssignmentRepository;
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.additionalNoteRepository = additionalNoteRepository;
    }

    public TaskEntry task(User owner, LocalDate entryDate, String title, String category, TaskStatus status) {
        TaskEntry task = new TaskEntry();
        task.setOwner(owner);
        task.setEntryDate(entryDate);
        task.setTitle(title);
        task.setCategory(taskCategoryRepository.findByNameIgnoreCase(category).orElseThrow());
        task.setStatus(status);
        task.setPriority(TaskPriority.MEDIUM);
        return taskEntryRepository.save(task);
    }

    public IssueEntry issue(User owner, LocalDate entryDate, String title, IssueStatus status,
                            IssueSeverity severity) {
        IssueEntry issue = new IssueEntry();
        issue.setOwner(owner);
        issue.setEntryDate(entryDate);
        issue.setTitle(title);
        issue.setStatus(status);
        issue.setSeverity(severity);
        if (status == IssueStatus.RESOLVED || status == IssueStatus.CLOSED) {
            issue.setResolutionNotes("Seeded resolution");
        }
        return issueEntryRepository.save(issue);
    }

    public FeedbackNote feedback(User owner, LocalDate entryDate, String subject, FeedbackType type) {
        FeedbackNote feedback = new FeedbackNote();
        feedback.setOwner(owner);
        feedback.setEntryDate(entryDate);
        feedback.setSubject(subject);
        feedback.setType(type);
        feedback.setDetails("Seeded feedback details");
        return feedbackNoteRepository.save(feedback);
    }

    /** Tags are stored as given here, so callers seed already normalised values. */
    public AdditionalNote note(User owner, LocalDate entryDate, String title, String... tags) {
        AdditionalNote note = new AdditionalNote();
        note.setOwner(owner);
        note.setEntryDate(entryDate);
        note.setTitle(title);
        note.setContent("Seeded note content");
        note.setTags(new LinkedHashSet<>(Set.of(tags)));
        return additionalNoteRepository.save(note);
    }

    /** Oversight is seeded directly: the admin endpoints in section 4.8 are a later phase. */
    public ManagerAssignment assign(User manager, User recruit) {
        ManagerAssignment assignment = new ManagerAssignment();
        assignment.setManager(manager);
        assignment.setRecruit(recruit);
        return managerAssignmentRepository.save(assignment);
    }
}
