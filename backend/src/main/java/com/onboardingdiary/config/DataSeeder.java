package com.onboardingdiary.config;

import com.onboardingdiary.entity.*;
import com.onboardingdiary.entity.enums.*;
import com.onboardingdiary.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackEntryRepository feedbackEntryRepository;
    private final NoteEntryRepository noteEntryRepository;
    private final TagRepository tagRepository;
    private final ManagerRecruitAssignmentRepository assignmentRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      TaskEntryRepository taskEntryRepository,
                      IssueEntryRepository issueEntryRepository,
                      FeedbackEntryRepository feedbackEntryRepository,
                      NoteEntryRepository noteEntryRepository,
                      TagRepository tagRepository,
                      ManagerRecruitAssignmentRepository assignmentRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackEntryRepository = feedbackEntryRepository;
        this.noteEntryRepository = noteEntryRepository;
        this.tagRepository = tagRepository;
        this.assignmentRepository = assignmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        // Create users
        User admin = createUser("Admin User", "admin@onboarding.com", "admin123", Role.ADMIN, "IT", LocalDate.now().minusMonths(6));
        User manager = createUser("Jane Manager", "manager@onboarding.com", "manager123", Role.MANAGER, "Engineering", LocalDate.now().minusMonths(3));
        User recruit1 = createUser("John Recruit", "john@onboarding.com", "recruit123", Role.RECRUIT, "Engineering", LocalDate.now());
        User recruit2 = createUser("Alice Recruit", "alice@onboarding.com", "recruit123", Role.RECRUIT, "Design", LocalDate.now());

        // Create tags
        Tag training = createTag("training");
        Tag documentation = createTag("documentation");
        Tag technical = createTag("technical");
        Tag process = createTag("process");
        Tag team = createTag("team");
        Tag tools = createTag("tools");

        // Assign recruits to manager
        createAssignment(manager, recruit1);
        createAssignment(manager, recruit2);

        // Sample tasks for recruit 1
        createTask(recruit1, LocalDate.now(), "Complete HR Onboarding", "Fill out all HR forms and documents", "Documentation", TaskStatus.COMPLETED, Priority.HIGH);
        createTask(recruit1, LocalDate.now(), "Setup Development Environment", "Install IDE, configure git, setup local DB", "Development", TaskStatus.IN_PROGRESS, Priority.HIGH);
        createTask(recruit1, LocalDate.now().minusDays(1), "Read Team Wiki", "Go through team documentation and processes", "Documentation", TaskStatus.COMPLETED, Priority.MEDIUM);
        createTask(recruit1, LocalDate.now().plusDays(1), "Attend Architecture Overview", "Join meeting about system architecture", "Meeting", TaskStatus.NOT_STARTED, Priority.MEDIUM);

        // Sample tasks for recruit 2
        createTask(recruit2, LocalDate.now(), "Design System Review", "Review the design system documentation", "Documentation", TaskStatus.IN_PROGRESS, Priority.HIGH);
        createTask(recruit2, LocalDate.now(), "Setup Figma Access", "Get access to team Figma workspace", "Other", TaskStatus.COMPLETED, Priority.MEDIUM);
        createTask(recruit2, LocalDate.now().minusDays(1), "Brand Guidelines Review", "Study company brand guidelines", "Training", TaskStatus.COMPLETED, Priority.HIGH);

        // Sample issues for recruit 1
        createIssue(recruit1, LocalDate.now(), "VPN Connection Issues", "Cannot connect to company VPN from home", IssueSeverity.HIGH, IssueStatus.OPEN, null);
        createIssue(recruit1, LocalDate.now().minusDays(1), "Missing Repository Access", "Don't have access to the main code repository", IssueSeverity.MEDIUM, IssueStatus.RESOLVED, "IT granted access after ticket submission");

        // Sample feedback for recruit 2
        createFeedback(recruit2, LocalDate.now(), "Great Onboarding Experience", FeedbackType.POSITIVE, "The onboarding process has been very smooth and well-organized");
        createFeedback(recruit2, LocalDate.now().minusDays(1), "Documentation Could Be Better", FeedbackType.SUGGESTION, "Some of the internal documentation is outdated and could use refreshing");

        // Sample notes for recruit 1
        Set<Tag> noteTags1 = new HashSet<>();
        noteTags1.add(technical);
        noteTags1.add(tools);
        createNote(recruit1, LocalDate.now(), "Dev Environment Notes", "Java 17 required, use Maven wrapper, H2 for local DB", noteTags1);

        Set<Tag> noteTags2 = new HashSet<>();
        noteTags2.add(team);
        noteTags2.add(process);
        createNote(recruit1, LocalDate.now().minusDays(1), "Team Standup Format", "Daily standup at 9:30 AM, round-robin format, keep updates brief", noteTags2);

        // Sample notes for recruit 2
        Set<Tag> noteTags3 = new HashSet<>();
        noteTags3.add(documentation);
        noteTags3.add(training);
        createNote(recruit2, LocalDate.now(), "Design Tools", "Team uses Figma for mockups, Zeplin for handoff", noteTags3);

        Set<Tag> noteTags4 = new HashSet<>();
        noteTags4.add(process);
        createNote(recruit2, LocalDate.now().minusDays(1), "Design Review Process", "Submit designs for review by Thursday, feedback session on Friday", noteTags4);
    }

    private User createUser(String name, String email, String password, Role role, String department, LocalDate startDate) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        user.setDepartment(department);
        user.setStartDate(startDate);
        return userRepository.save(user);
    }

    private Tag createTag(String name) {
        Tag tag = new Tag(name);
        return tagRepository.save(tag);
    }

    private void createAssignment(User manager, User recruit) {
        ManagerRecruitAssignment assignment = new ManagerRecruitAssignment();
        assignment.setManager(manager);
        assignment.setRecruit(recruit);
        assignmentRepository.save(assignment);
    }

    private void createTask(User user, LocalDate date, String title, String description,
                             String category, TaskStatus status, Priority priority) {
        TaskEntry task = new TaskEntry();
        task.setDate(date);
        task.setTitle(title);
        task.setDescription(description);
        task.setCategory(category);
        task.setStatus(status);
        task.setPriority(priority);
        task.setUser(user);
        taskEntryRepository.save(task);
    }

    private void createIssue(User user, LocalDate date, String title, String description,
                              IssueSeverity severity, IssueStatus status, String resolutionNotes) {
        IssueEntry issue = new IssueEntry();
        issue.setDate(date);
        issue.setTitle(title);
        issue.setDescription(description);
        issue.setSeverity(severity);
        issue.setStatus(status);
        issue.setResolutionNotes(resolutionNotes);
        issue.setUser(user);
        issueEntryRepository.save(issue);
    }

    private void createFeedback(User user, LocalDate date, String subject, FeedbackType type, String details) {
        FeedbackEntry feedback = new FeedbackEntry();
        feedback.setDate(date);
        feedback.setSubject(subject);
        feedback.setType(type);
        feedback.setDetails(details);
        feedback.setUser(user);
        feedbackEntryRepository.save(feedback);
    }

    private void createNote(User user, LocalDate date, String title, String content, Set<Tag> tags) {
        NoteEntry note = new NoteEntry();
        note.setDate(date);
        note.setTitle(title);
        note.setContent(content);
        note.setUser(user);
        note.setTags(tags);
        noteEntryRepository.save(note);
    }
}
