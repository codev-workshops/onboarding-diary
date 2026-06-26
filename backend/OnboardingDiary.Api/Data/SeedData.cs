// Test Credentials:
// Admin:    admin@onboarding.com / Admin@123
// Manager:  sarah.johnson@onboarding.com / Password@123
// Manager:  michael.chen@onboarding.com / Password@123
// Recruit:  emily.davis@onboarding.com / Password@123
// Recruit:  james.wilson@onboarding.com / Password@123
// Recruit:  sophia.martinez@onboarding.com / Password@123
// Recruit:  liam.anderson@onboarding.com / Password@123

using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.MigrateAsync();

        if (await context.Users.AnyAsync())
            return;

        // --- Departments ---
        var departments = new[]
        {
            new Department { Name = "Engineering", Description = "Software engineering and development", CreatedAt = DateTime.UtcNow },
            new Department { Name = "Design", Description = "UI/UX and product design", CreatedAt = DateTime.UtcNow },
            new Department { Name = "Product", Description = "Product management and strategy", CreatedAt = DateTime.UtcNow }
        };

        context.Departments.AddRange(departments);

        // --- Categories ---
        var categories = new[]
        {
            new Category { Name = "Setup", Description = "Environment setup and configuration tasks", CreatedAt = DateTime.UtcNow },
            new Category { Name = "Training", Description = "Training and learning activities", CreatedAt = DateTime.UtcNow },
            new Category { Name = "Documentation", Description = "Documentation and knowledge base tasks", CreatedAt = DateTime.UtcNow }
        };

        context.Categories.AddRange(categories);

        // --- Users ---
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password@123");
        var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");

        var adminUser = new User
        {
            Name = "Admin",
            Email = "admin@onboarding.com",
            PasswordHash = adminPasswordHash,
            Role = UserRole.Admin,
            Department = "Engineering",
            StartDate = DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var managerSarah = new User
        {
            Name = "Sarah Johnson",
            Email = "sarah.johnson@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Manager,
            Department = "Engineering",
            StartDate = DateTime.UtcNow.AddDays(-90),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var managerMichael = new User
        {
            Name = "Michael Chen",
            Email = "michael.chen@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Manager,
            Department = "Design",
            StartDate = DateTime.UtcNow.AddDays(-90),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(adminUser, managerSarah, managerMichael);
        await context.SaveChangesAsync();

        // Create recruits with manager references
        var recruitEmily = new User
        {
            Name = "Emily Davis",
            Email = "emily.davis@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Recruit,
            Department = "Engineering",
            ManagerId = managerSarah.Id,
            StartDate = DateTime.UtcNow.AddDays(-30),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var recruitJames = new User
        {
            Name = "James Wilson",
            Email = "james.wilson@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Recruit,
            Department = "Engineering",
            ManagerId = managerSarah.Id,
            StartDate = DateTime.UtcNow.AddDays(-14),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var recruitSophia = new User
        {
            Name = "Sophia Martinez",
            Email = "sophia.martinez@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Recruit,
            Department = "Design",
            ManagerId = managerMichael.Id,
            StartDate = DateTime.UtcNow.AddDays(-21),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var recruitLiam = new User
        {
            Name = "Liam Anderson",
            Email = "liam.anderson@onboarding.com",
            PasswordHash = passwordHash,
            Role = UserRole.Recruit,
            Department = "Product",
            ManagerId = managerSarah.Id,
            StartDate = DateTime.UtcNow.AddDays(-7),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(recruitEmily, recruitJames, recruitSophia, recruitLiam);
        await context.SaveChangesAsync();

        // --- Task Entries ---
        var taskEntries = new[]
        {
            // Emily Davis (30 days in, most complete)
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Set up development environment",
                Description = "Install all required development tools and configure local environment",
                Category = "Setup",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-28),
                CreatedAt = DateTime.UtcNow.AddDays(-28),
                UpdatedAt = DateTime.UtcNow.AddDays(-27)
            },
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Complete Git training",
                Description = "Complete the internal Git workflow training module",
                Category = "Training",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-25),
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddDays(-24)
            },
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Read team coding standards",
                Description = "Review and understand the team's coding standards document",
                Category = "Documentation",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-23),
                CreatedAt = DateTime.UtcNow.AddDays(-23),
                UpdatedAt = DateTime.UtcNow.AddDays(-22)
            },
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Build first feature branch",
                Description = "Create a feature branch and implement a small feature end-to-end",
                Category = "Setup",
                Status = TaskEntryStatus.InProgress,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-10),
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Write unit tests for login module",
                Description = "Write comprehensive unit tests for the authentication module",
                Category = "Training",
                Status = TaskEntryStatus.NotStarted,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-5),
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new TaskEntry
            {
                UserId = recruitEmily.Id,
                Title = "Review pull request process",
                Description = "Understand the team's PR review workflow and guidelines",
                Category = "Documentation",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Low,
                Date = DateTime.UtcNow.AddDays(-20),
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-19)
            },

            // James Wilson (14 days in)
            new TaskEntry
            {
                UserId = recruitJames.Id,
                Title = "Install required tools",
                Description = "Install IDE, Docker, and other required development tools",
                Category = "Setup",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-13),
                CreatedAt = DateTime.UtcNow.AddDays(-13),
                UpdatedAt = DateTime.UtcNow.AddDays(-12)
            },
            new TaskEntry
            {
                UserId = recruitJames.Id,
                Title = "Complete onboarding checklist",
                Description = "Go through all items in the new hire onboarding checklist",
                Category = "Documentation",
                Status = TaskEntryStatus.InProgress,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-10),
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-7)
            },
            new TaskEntry
            {
                UserId = recruitJames.Id,
                Title = "Set up CI/CD pipeline access",
                Description = "Get access to CI/CD pipelines and understand deployment workflow",
                Category = "Setup",
                Status = TaskEntryStatus.Blocked,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-7),
                CreatedAt = DateTime.UtcNow.AddDays(-7),
                UpdatedAt = DateTime.UtcNow.AddDays(-7)
            },
            new TaskEntry
            {
                UserId = recruitJames.Id,
                Title = "Attend team standup",
                Description = "Join daily standup meetings and understand team workflow",
                Category = "Training",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Low,
                Date = DateTime.UtcNow.AddDays(-12),
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = DateTime.UtcNow.AddDays(-11)
            },

            // Sophia Martinez (21 days in)
            new TaskEntry
            {
                UserId = recruitSophia.Id,
                Title = "Set up Figma workspace",
                Description = "Configure Figma workspace with team libraries and plugins",
                Category = "Setup",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-20),
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-19)
            },
            new TaskEntry
            {
                UserId = recruitSophia.Id,
                Title = "Review design system",
                Description = "Study the existing design system components and patterns",
                Category = "Documentation",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-18),
                CreatedAt = DateTime.UtcNow.AddDays(-18),
                UpdatedAt = DateTime.UtcNow.AddDays(-17)
            },
            new TaskEntry
            {
                UserId = recruitSophia.Id,
                Title = "Create first mockup",
                Description = "Design a mockup for an assigned feature using the design system",
                Category = "Training",
                Status = TaskEntryStatus.InProgress,
                Priority = Priority.High,
                Date = DateTime.UtcNow.AddDays(-12),
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = DateTime.UtcNow.AddDays(-8)
            },
            new TaskEntry
            {
                UserId = recruitSophia.Id,
                Title = "Study brand guidelines",
                Description = "Review and internalize the company brand guidelines",
                Category = "Documentation",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Low,
                Date = DateTime.UtcNow.AddDays(-15),
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-14)
            },
            new TaskEntry
            {
                UserId = recruitSophia.Id,
                Title = "Design user flow for settings page",
                Description = "Create user flow diagrams for the new settings page redesign",
                Category = "Training",
                Status = TaskEntryStatus.NotStarted,
                Priority = Priority.Critical,
                Date = DateTime.UtcNow.AddDays(-3),
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },

            // Liam Anderson (7 days in)
            new TaskEntry
            {
                UserId = recruitLiam.Id,
                Title = "Set up laptop and accounts",
                Description = "Configure laptop, create accounts for all required services",
                Category = "Setup",
                Status = TaskEntryStatus.Completed,
                Priority = Priority.Critical,
                Date = DateTime.UtcNow.AddDays(-6),
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new TaskEntry
            {
                UserId = recruitLiam.Id,
                Title = "Read product roadmap",
                Description = "Review the current product roadmap and understand priorities",
                Category = "Documentation",
                Status = TaskEntryStatus.InProgress,
                Priority = Priority.Medium,
                Date = DateTime.UtcNow.AddDays(-4),
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        context.TaskEntries.AddRange(taskEntries);

        // --- Issue Entries ---
        var issueEntries = new[]
        {
            // Emily Davis
            new IssueEntry
            {
                UserId = recruitEmily.Id,
                Title = "VPN connection drops frequently",
                Description = "VPN disconnects every 30-60 minutes requiring manual reconnection",
                Severity = IssueSeverity.High,
                Status = IssueStatus.Resolved,
                ResolutionNotes = "IT reconfigured VPN split tunneling",
                Date = DateTime.UtcNow.AddDays(-22),
                CreatedAt = DateTime.UtcNow.AddDays(-22),
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new IssueEntry
            {
                UserId = recruitEmily.Id,
                Title = "Build failing on ARM Mac",
                Description = "Project build fails on M1/M2 Mac due to native dependency issues",
                Severity = IssueSeverity.Medium,
                Status = IssueStatus.Open,
                Date = DateTime.UtcNow.AddDays(-8),
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                UpdatedAt = DateTime.UtcNow.AddDays(-8)
            },

            // James Wilson
            new IssueEntry
            {
                UserId = recruitJames.Id,
                Title = "Cannot access staging environment",
                Description = "Staging environment returns 403 Forbidden for all API endpoints",
                Severity = IssueSeverity.High,
                Status = IssueStatus.Open,
                Date = DateTime.UtcNow.AddDays(-6),
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                UpdatedAt = DateTime.UtcNow.AddDays(-6)
            },
            new IssueEntry
            {
                UserId = recruitJames.Id,
                Title = "Docker containers crash on startup",
                Description = "Docker containers exit with code 137 (OOM) when running full stack locally",
                Severity = IssueSeverity.Critical,
                Status = IssueStatus.InProgress,
                Date = DateTime.UtcNow.AddDays(-4),
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },

            // Sophia Martinez
            new IssueEntry
            {
                UserId = recruitSophia.Id,
                Title = "Figma plugin compatibility issue",
                Description = "Design tokens plugin crashes when syncing with the design system",
                Severity = IssueSeverity.Low,
                Status = IssueStatus.Resolved,
                ResolutionNotes = "Updated to latest Figma version",
                Date = DateTime.UtcNow.AddDays(-16),
                CreatedAt = DateTime.UtcNow.AddDays(-16),
                UpdatedAt = DateTime.UtcNow.AddDays(-15)
            },

            // Liam Anderson
            new IssueEntry
            {
                UserId = recruitLiam.Id,
                Title = "Email not receiving team notifications",
                Description = "Not receiving email notifications from team channels and CI/CD pipeline",
                Severity = IssueSeverity.Medium,
                Status = IssueStatus.Open,
                Date = DateTime.UtcNow.AddDays(-3),
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        context.IssueEntries.AddRange(issueEntries);

        // --- Feedback Entries ---
        var feedbackEntries = new[]
        {
            // Emily Davis
            new FeedbackEntry
            {
                UserId = recruitEmily.Id,
                Subject = "Great pair programming session",
                Type = FeedbackType.Positive,
                Details = "Had an excellent pair programming session with the senior dev. Learned a lot about the codebase architecture.",
                Date = DateTime.UtcNow.AddDays(-20),
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new FeedbackEntry
            {
                UserId = recruitEmily.Id,
                Subject = "Documentation could be improved",
                Type = FeedbackType.Suggestion,
                Details = "The internal wiki has outdated setup instructions. It would be helpful to update the Getting Started guide.",
                Date = DateTime.UtcNow.AddDays(-15),
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-15)
            },
            new FeedbackEntry
            {
                UserId = recruitEmily.Id,
                Subject = "Onboarding buddy program is amazing",
                Type = FeedbackType.Positive,
                Details = "Having a dedicated onboarding buddy has been incredibly helpful for navigating the company culture.",
                Date = DateTime.UtcNow.AddDays(-10),
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-10)
            },

            // James Wilson
            new FeedbackEntry
            {
                UserId = recruitJames.Id,
                Subject = "Meeting overload in first week",
                Type = FeedbackType.Concern,
                Details = "Had 15 meetings in the first 3 days which left no time for actual setup tasks. Suggest spreading orientation meetings over the first two weeks.",
                Date = DateTime.UtcNow.AddDays(-12),
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = DateTime.UtcNow.AddDays(-12)
            },
            new FeedbackEntry
            {
                UserId = recruitJames.Id,
                Subject = "Team lunch was welcoming",
                Type = FeedbackType.Positive,
                Details = "The welcome team lunch made me feel part of the team right away.",
                Date = DateTime.UtcNow.AddDays(-11),
                CreatedAt = DateTime.UtcNow.AddDays(-11),
                UpdatedAt = DateTime.UtcNow.AddDays(-11)
            },

            // Sophia Martinez
            new FeedbackEntry
            {
                UserId = recruitSophia.Id,
                Subject = "Design critique sessions are valuable",
                Type = FeedbackType.Positive,
                Details = "Weekly design critique sessions provide great feedback and learning opportunities.",
                Date = DateTime.UtcNow.AddDays(-14),
                CreatedAt = DateTime.UtcNow.AddDays(-14),
                UpdatedAt = DateTime.UtcNow.AddDays(-14)
            },
            new FeedbackEntry
            {
                UserId = recruitSophia.Id,
                Subject = "Need better cross-team communication",
                Type = FeedbackType.Suggestion,
                Details = "Would benefit from regular syncs between design and engineering teams during sprint planning.",
                Date = DateTime.UtcNow.AddDays(-7),
                CreatedAt = DateTime.UtcNow.AddDays(-7),
                UpdatedAt = DateTime.UtcNow.AddDays(-7)
            },

            // Liam Anderson
            new FeedbackEntry
            {
                UserId = recruitLiam.Id,
                Subject = "Overwhelming amount of documentation",
                Type = FeedbackType.Concern,
                Details = "There's so much documentation to read in the first week. A prioritized reading list would help.",
                Date = DateTime.UtcNow.AddDays(-5),
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            }
        };

        context.FeedbackEntries.AddRange(feedbackEntries);

        // --- Note Entries ---
        // Emily Davis
        var noteEmily1 = new NoteEntry
        {
            UserId = recruitEmily.Id,
            Title = "Architecture Overview Notes",
            Content = "The system uses a microservices architecture with an API gateway. Key services include auth-service, user-service, and notification-service. Each service has its own database.",
            Date = DateTime.UtcNow.AddDays(-26),
            CreatedAt = DateTime.UtcNow.AddDays(-26),
            UpdatedAt = DateTime.UtcNow.AddDays(-26),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "architecture" },
                new NoteTag { Tag = "microservices" },
                new NoteTag { Tag = "backend" }
            }
        };

        var noteEmily2 = new NoteEntry
        {
            UserId = recruitEmily.Id,
            Title = "Team Meeting Notes - Sprint Planning",
            Content = "Sprint goal: Complete user profile redesign. Key decisions: Use React Query for data fetching, implement optimistic updates.",
            Date = DateTime.UtcNow.AddDays(-18),
            CreatedAt = DateTime.UtcNow.AddDays(-18),
            UpdatedAt = DateTime.UtcNow.AddDays(-18),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "meeting" },
                new NoteTag { Tag = "sprint" },
                new NoteTag { Tag = "planning" }
            }
        };

        var noteEmily3 = new NoteEntry
        {
            UserId = recruitEmily.Id,
            Title = "Useful CLI Commands",
            Content = "docker compose up -d, git rebase -i HEAD~3, npm run test:watch, kubectl get pods -n staging",
            Date = DateTime.UtcNow.AddDays(-12),
            CreatedAt = DateTime.UtcNow.AddDays(-12),
            UpdatedAt = DateTime.UtcNow.AddDays(-12),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "cli" },
                new NoteTag { Tag = "docker" },
                new NoteTag { Tag = "git" },
                new NoteTag { Tag = "tips" }
            }
        };

        // James Wilson
        var noteJames1 = new NoteEntry
        {
            UserId = recruitJames.Id,
            Title = "HR Onboarding Checklist",
            Content = "Benefits enrollment deadline: end of month. Set up 401k. Review PTO policy. Complete security training by day 30.",
            Date = DateTime.UtcNow.AddDays(-13),
            CreatedAt = DateTime.UtcNow.AddDays(-13),
            UpdatedAt = DateTime.UtcNow.AddDays(-13),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "hr" },
                new NoteTag { Tag = "onboarding" },
                new NoteTag { Tag = "checklist" }
            }
        };

        var noteJames2 = new NoteEntry
        {
            UserId = recruitJames.Id,
            Title = "Team Structure Notes",
            Content = "Engineering team has 4 squads: Platform, Product, Data, and Infrastructure. Each squad has 5-7 engineers + 1 PM + 1 designer.",
            Date = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "team" },
                new NoteTag { Tag = "organization" }
            }
        };

        // Sophia Martinez
        var noteSophia1 = new NoteEntry
        {
            UserId = recruitSophia.Id,
            Title = "Design System Components",
            Content = "Primary components: Button (4 variants), Input, Select, Card, Modal, Toast. Color palette uses HSL. Typography scale: 12/14/16/20/24/32px.",
            Date = DateTime.UtcNow.AddDays(-19),
            CreatedAt = DateTime.UtcNow.AddDays(-19),
            UpdatedAt = DateTime.UtcNow.AddDays(-19),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "design-system" },
                new NoteTag { Tag = "components" },
                new NoteTag { Tag = "ui" }
            }
        };

        var noteSophia2 = new NoteEntry
        {
            UserId = recruitSophia.Id,
            Title = "User Research Methodology",
            Content = "Team uses a mix of usability testing, A/B tests, and user interviews. Research repository in Notion. Always get PM approval before scheduling user sessions.",
            Date = DateTime.UtcNow.AddDays(-11),
            CreatedAt = DateTime.UtcNow.AddDays(-11),
            UpdatedAt = DateTime.UtcNow.AddDays(-11),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "research" },
                new NoteTag { Tag = "methodology" },
                new NoteTag { Tag = "ux" }
            }
        };

        // Liam Anderson
        var noteLiam1 = new NoteEntry
        {
            UserId = recruitLiam.Id,
            Title = "Product Vision Summary",
            Content = "Company mission: simplify onboarding for remote teams. Key metrics: time-to-productivity, new hire satisfaction score, 90-day retention rate.",
            Date = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5),
            Tags = new List<NoteTag>
            {
                new NoteTag { Tag = "product" },
                new NoteTag { Tag = "vision" },
                new NoteTag { Tag = "metrics" }
            }
        };

        context.NoteEntries.AddRange(noteEmily1, noteEmily2, noteEmily3, noteJames1, noteJames2, noteSophia1, noteSophia2, noteLiam1);

        await context.SaveChangesAsync();
    }
}
