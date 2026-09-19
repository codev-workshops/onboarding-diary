package com.codev.onboardingdiary.support;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.FeedbackType;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Note;
import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.Severity;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.FeedbackRepository;
import com.codev.onboardingdiary.repository.IssueRepository;
import com.codev.onboardingdiary.repository.NoteRepository;
import com.codev.onboardingdiary.repository.TaskRepository;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

/** Shared Spring context, MockMvc and a small fixture of users and diary entries. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class IntegrationTest {

    public static final String PASSWORD = "Password123!";

    @Autowired protected MockMvc mockMvc;
    @Autowired protected UserRepository userRepository;
    @Autowired protected TaskRepository taskRepository;
    @Autowired protected IssueRepository issueRepository;
    @Autowired protected FeedbackRepository feedbackRepository;
    @Autowired protected NoteRepository noteRepository;
    @Autowired protected PasswordEncoder passwordEncoder;

    protected User admin;
    protected User manager;
    protected User otherManager;
    protected User recruit;
    protected User otherRecruit;
    protected User disabledRecruit;
    protected Task recruitTask;
    protected Issue recruitIssue;
    protected Feedback recruitFeedback;
    protected Note recruitNote;

    @BeforeEach
    void seedFixture() {
        noteRepository.deleteAll();
        feedbackRepository.deleteAll();
        issueRepository.deleteAll();
        taskRepository.deleteAll();
        userRepository.deleteAll();

        admin = user("Ada Admin", "admin@test.local", Role.ADMIN, null, true);
        manager = user("Mia Manager", "manager@test.local", Role.MANAGER, null, true);
        otherManager = user("Otto Manager", "other-manager@test.local", Role.MANAGER, null, true);
        recruit = user("Rita Recruit", "recruit@test.local", Role.RECRUIT, manager, true);
        otherRecruit = user("Ravi Recruit", "other-recruit@test.local", Role.RECRUIT, otherManager, true);
        disabledRecruit = user("Dana Disabled", "disabled@test.local", Role.RECRUIT, manager, false);

        recruitTask = task(recruit, LocalDate.now().minusDays(2), "Set up VPN access", "Setup",
                TaskStatus.COMPLETED, Priority.HIGH, "Installed the VPN client");
        task(recruit, LocalDate.now().minusDays(1), "Read the handbook", "Learning",
                TaskStatus.TODO, Priority.MEDIUM, "Company handbook");
        task(recruit, LocalDate.now().minusDays(20), "Meet the team", "Social",
                TaskStatus.IN_PROGRESS, Priority.LOW, "Coffee chats");

        recruitIssue = issue(recruit, LocalDate.now().minusDays(2), "VPN certificate rejected",
                Severity.HIGH, IssueStatus.OPEN, "The VPN client rejects my certificate");
        issue(recruit, LocalDate.now().minusDays(3), "Badge not working",
                Severity.LOW, IssueStatus.RESOLVED, "Reception issued a new badge");

        recruitFeedback = feedback(recruit, LocalDate.now().minusDays(1), "Buddy system is great",
                FeedbackType.POSITIVE, "My buddy answered every VPN question");
        recruitNote = note(recruit, LocalDate.now().minusDays(1), "Week one notes",
                "Remember to request VPN hardware token", "week1,setup");

        task(otherRecruit, LocalDate.now().minusDays(1), "Other recruit task", "Setup",
                TaskStatus.TODO, Priority.LOW, "Not visible to Rita");
    }

    protected User user(String name, String email, Role role, User managerOf, boolean active) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRole(role);
        user.setManager(managerOf);
        user.setActive(active);
        user.setDepartment("Engineering");
        user.setStartDate(LocalDate.now().minusMonths(1));
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    protected Task task(User owner, LocalDate date, String title, String category,
                        TaskStatus status, Priority priority, String description) {
        Task task = new Task();
        task.setUser(owner);
        task.setDate(date);
        task.setTitle(title);
        task.setCategory(category);
        task.setStatus(status);
        task.setPriority(priority);
        task.setDescription(description);
        return taskRepository.save(task);
    }

    protected Issue issue(User owner, LocalDate date, String title, Severity severity,
                          IssueStatus status, String description) {
        Issue issue = new Issue();
        issue.setUser(owner);
        issue.setDate(date);
        issue.setTitle(title);
        issue.setSeverity(severity);
        issue.setStatus(status);
        issue.setDescription(description);
        return issueRepository.save(issue);
    }

    protected Feedback feedback(User owner, LocalDate date, String subject, FeedbackType type, String details) {
        Feedback feedback = new Feedback();
        feedback.setUser(owner);
        feedback.setDate(date);
        feedback.setSubject(subject);
        feedback.setType(type);
        feedback.setDetails(details);
        return feedbackRepository.save(feedback);
    }

    protected Note note(User owner, LocalDate date, String title, String content, String tags) {
        Note note = new Note();
        note.setUser(owner);
        note.setDate(date);
        note.setTitle(title);
        note.setContent(content);
        note.setTags(tags);
        return noteRepository.save(note);
    }

    protected RequestPostProcessor as(User user) {
        return SecurityMockMvcRequestPostProcessors.user(new AppUserDetails(user));
    }

    protected AppUserDetails principal(User user) {
        return new AppUserDetails(user);
    }
}
