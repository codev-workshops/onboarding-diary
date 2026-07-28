package com.workshop.onboardingdiary.support;

import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.ManagerAssignment;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskPriority;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.ManagerAssignmentRepository;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** Seeds tasks, issues and manager assignments directly through the repositories. */
@Component
public class TestEntries {

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final TaskCategoryRepository taskCategoryRepository;
    private final ManagerAssignmentRepository managerAssignmentRepository;

    public TestEntries(TaskEntryRepository taskEntryRepository,
                       IssueEntryRepository issueEntryRepository,
                       TaskCategoryRepository taskCategoryRepository,
                       ManagerAssignmentRepository managerAssignmentRepository) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.taskCategoryRepository = taskCategoryRepository;
        this.managerAssignmentRepository = managerAssignmentRepository;
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

    /** Oversight is seeded directly: the admin endpoints in section 4.8 are a later phase. */
    public ManagerAssignment assign(User manager, User recruit) {
        ManagerAssignment assignment = new ManagerAssignment();
        assignment.setManager(manager);
        assignment.setRecruit(recruit);
        return managerAssignmentRepository.save(assignment);
    }
}
