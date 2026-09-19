package com.codev.onboardingdiary.config;

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
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Configuration
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    @Bean
    public ApplicationRunner seedDemoData(UserRepository userRepository,
                                          TaskRepository taskRepository,
                                          IssueRepository issueRepository,
                                          FeedbackRepository feedbackRepository,
                                          NoteRepository noteRepository,
                                          PasswordEncoder passwordEncoder,
                                          @Value("${app.demo-data.password}") String demoPassword) {
        return args -> seed(userRepository, taskRepository, issueRepository, feedbackRepository, noteRepository,
                passwordEncoder, demoPassword);
    }

    @Transactional
    void seed(UserRepository userRepository,
              TaskRepository taskRepository,
              IssueRepository issueRepository,
              FeedbackRepository feedbackRepository,
              NoteRepository noteRepository,
              PasswordEncoder passwordEncoder,
              String demoPassword) {
        if (userRepository.count() > 0) {
            return;
        }
        String hash = passwordEncoder.encode(demoPassword);

        User admin = user("Alice Admin", "admin@example.com", hash, Role.ADMIN, "People Ops", null);
        User manager = user("Mia Manager", "manager@example.com", hash, Role.MANAGER, "Engineering", null);
        userRepository.save(admin);
        userRepository.save(manager);

        User recruit = user("Raj Recruit", "recruit@example.com", hash, Role.RECRUIT, "Engineering", manager);
        recruit.setStartDate(LocalDate.now().minusWeeks(3));
        User second = user("Nora Newbie", "recruit2@example.com", hash, Role.RECRUIT, "Design", manager);
        second.setStartDate(LocalDate.now().minusWeeks(1));
        userRepository.save(recruit);
        userRepository.save(second);

        taskRepository.save(task(recruit, LocalDate.now().minusDays(12), "Set up laptop and accounts",
                "Installed IDE, VPN and joined team channels.", "Setup", TaskStatus.COMPLETED, Priority.HIGH));
        taskRepository.save(task(recruit, LocalDate.now().minusDays(9), "Complete security training",
                "Finished the mandatory security awareness modules.", "Training", TaskStatus.COMPLETED,
                Priority.MEDIUM));
        taskRepository.save(task(recruit, LocalDate.now().minusDays(10), "Shadow on-call rotation",
                "Waiting for the next rotation slot.", "Training", TaskStatus.IN_PROGRESS, Priority.MEDIUM));
        taskRepository.save(task(recruit, LocalDate.now().minusDays(2), "Ship first bug fix",
                "Pairing with the mentor on a starter ticket.", "Delivery", TaskStatus.TODO, Priority.HIGH));
        taskRepository.save(task(second, LocalDate.now().minusDays(4), "Read design system docs",
                "Reviewing component library guidelines.", "Training", TaskStatus.IN_PROGRESS, Priority.LOW));

        issueRepository.save(issue(recruit, LocalDate.now().minusDays(11), "VPN certificate rejected",
                "The corporate VPN client refuses the issued certificate.", Severity.HIGH, IssueStatus.RESOLVED,
                "IT re-issued the certificate."));
        issueRepository.save(issue(recruit, LocalDate.now().minusDays(3), "No access to staging database",
                "Read-only staging credentials were never provisioned.", Severity.MEDIUM, IssueStatus.OPEN, null));
        issueRepository.save(issue(second, LocalDate.now().minusDays(1), "Figma seat missing",
                "Cannot open team files without an editor seat.", Severity.LOW, IssueStatus.OPEN, null));

        feedbackRepository.save(feedback(recruit, LocalDate.now().minusDays(8), "Great onboarding buddy",
                FeedbackType.POSITIVE, "My buddy answered every question within minutes - very helpful."));
        feedbackRepository.save(feedback(recruit, LocalDate.now().minusDays(5), "Access requests are slow",
                FeedbackType.CONCERN, "Waiting several days for tool access blocks the first tickets."));
        feedbackRepository.save(feedback(second, LocalDate.now().minusDays(2), "Add a checklist to week one",
                FeedbackType.SUGGESTION, "A printable checklist would make the first week easier to follow."));

        noteRepository.save(note(recruit, LocalDate.now().minusDays(7), "Deployment pipeline notes",
                "Builds run on CI, promotion to staging is manual and requires a reviewer approval.",
                "ci,deployment"));
        noteRepository.save(note(second, LocalDate.now().minusDays(1), "Design review cadence",
                "Design reviews happen every Tuesday at 10:00 in the studio channel.", "process"));

        log.info("Seeded demo accounts: admin@example.com, manager@example.com, recruit@example.com, "
                + "recruit2@example.com");
    }

    private static User user(String name, String email, String hash, Role role, String department, User manager) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(hash);
        user.setRole(role);
        user.setDepartment(department);
        user.setManager(manager);
        user.setActive(true);
        return user;
    }

    private static Task task(User user, LocalDate date, String title, String description, String category,
                             TaskStatus status, Priority priority) {
        Task task = new Task();
        task.setUser(user);
        task.setDate(date);
        task.setTitle(title);
        task.setDescription(description);
        task.setCategory(category);
        task.setStatus(status);
        task.setPriority(priority);
        return task;
    }

    private static Issue issue(User user, LocalDate date, String title, String description, Severity severity,
                               IssueStatus status, String resolutionNotes) {
        Issue issue = new Issue();
        issue.setUser(user);
        issue.setDate(date);
        issue.setTitle(title);
        issue.setDescription(description);
        issue.setSeverity(severity);
        issue.setStatus(status);
        issue.setResolutionNotes(resolutionNotes);
        return issue;
    }

    private static Feedback feedback(User user, LocalDate date, String subject, FeedbackType type, String details) {
        Feedback feedback = new Feedback();
        feedback.setUser(user);
        feedback.setDate(date);
        feedback.setSubject(subject);
        feedback.setType(type);
        feedback.setDetails(details);
        return feedback;
    }

    private static Note note(User user, LocalDate date, String title, String content, String tags) {
        Note note = new Note();
        note.setUser(user);
        note.setDate(date);
        note.setTitle(title);
        note.setContent(content);
        note.setTags(tags);
        return note;
    }
}
