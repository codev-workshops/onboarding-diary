using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TaskEntry> Tasks => Set<TaskEntry>();
    public DbSet<IssueEntry> Issues => Set<IssueEntry>();
    public DbSet<FeedbackNote> Feedback => Set<FeedbackNote>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();
        user.HasIndex(u => u.Email).IsUnique();
        user.Property(u => u.Email).HasMaxLength(256).IsRequired();
        user.Property(u => u.PasswordHash).IsRequired();
        user.Property(u => u.FullName).HasMaxLength(100).IsRequired();
        user.Property(u => u.Department).HasMaxLength(100).IsRequired();
        user.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        user.HasOne(u => u.Manager)
            .WithMany(u => u.Recruits)
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        ConfigureEntry<TaskEntry>(modelBuilder, task =>
        {
            task.Property(t => t.Title).HasMaxLength(200).IsRequired();
            task.Property(t => t.Description).HasMaxLength(2000);
            task.Property(t => t.Category).HasConversion<string>().HasMaxLength(20);
            task.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            task.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            task.HasIndex(t => t.Status);
            task.HasIndex(t => t.Category);
        });

        ConfigureEntry<IssueEntry>(modelBuilder, issue =>
        {
            issue.Property(i => i.Title).HasMaxLength(200).IsRequired();
            issue.Property(i => i.Description).HasMaxLength(2000).IsRequired();
            issue.Property(i => i.ResolutionNotes).HasMaxLength(2000);
            issue.Property(i => i.Severity).HasConversion<string>().HasMaxLength(20);
            issue.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
            issue.HasIndex(i => i.Status);
            issue.HasIndex(i => i.Severity);
        });

        ConfigureEntry<FeedbackNote>(modelBuilder, feedback =>
        {
            feedback.Property(f => f.Subject).HasMaxLength(200).IsRequired();
            feedback.Property(f => f.Details).HasMaxLength(2000).IsRequired();
            feedback.Property(f => f.Type).HasConversion<string>().HasMaxLength(20);
            feedback.HasIndex(f => f.Type);
        });

        ConfigureEntry<Note>(modelBuilder, note =>
        {
            note.Property(n => n.Title).HasMaxLength(200).IsRequired();
            note.Property(n => n.Content).HasMaxLength(5000).IsRequired();
        });
    }

    private static void ConfigureEntry<TEntry>(
        ModelBuilder modelBuilder,
        Action<Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntry>> configure)
        where TEntry : DiaryEntry
    {
        var entry = modelBuilder.Entity<TEntry>();
        entry.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        entry.HasIndex(e => e.UserId);
        entry.HasIndex(e => e.Date);
        configure(entry);
    }
}
