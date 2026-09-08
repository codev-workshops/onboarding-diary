using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Department> Departments => Set<Department>();

    public DbSet<TaskEntry> Tasks => Set<TaskEntry>();

    public DbSet<IssueEntry> Issues => Set<IssueEntry>();

    public DbSet<FeedbackEntry> Feedback => Set<FeedbackEntry>();

    public DbSet<NoteEntry> Notes => Set<NoteEntry>();

    public DbSet<NoteTag> NoteTags => Set<NoteTag>();

    public DbSet<ChecklistTemplate> ChecklistTemplates => Set<ChecklistTemplate>();

    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();

    public DbSet<ChecklistAssignment> ChecklistAssignments => Set<ChecklistAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
