using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<TaskEntry> TaskEntries => Set<TaskEntry>();
    public DbSet<IssueEntry> IssueEntries => Set<IssueEntry>();
    public DbSet<FeedbackEntry> FeedbackEntries => Set<FeedbackEntry>();
    public DbSet<NoteEntry> NoteEntries => Set<NoteEntry>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Name).HasMaxLength(100).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Department).HasMaxLength(100).IsRequired();
            entity.Property(u => u.Role)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(u => u.PasswordResetToken).HasMaxLength(256);

            entity.HasOne(u => u.Manager)
                .WithMany(u => u.Recruits)
                .HasForeignKey(u => u.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // TaskEntry
        modelBuilder.Entity<TaskEntry>(entity =>
        {
            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.Date);
            entity.Property(t => t.Title).HasMaxLength(200).IsRequired();
            entity.Property(t => t.Description).HasMaxLength(5000);
            entity.Property(t => t.Category).HasMaxLength(100).IsRequired();
            entity.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.Property(t => t.Priority)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(t => t.User)
                .WithMany(u => u.TaskEntries)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // IssueEntry
        modelBuilder.Entity<IssueEntry>(entity =>
        {
            entity.HasIndex(i => i.UserId);
            entity.HasIndex(i => i.Date);
            entity.Property(i => i.Title).HasMaxLength(200).IsRequired();
            entity.Property(i => i.Description).HasMaxLength(5000).IsRequired();
            entity.Property(i => i.ResolutionNotes).HasMaxLength(5000);
            entity.Property(i => i.Severity)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.Property(i => i.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(i => i.User)
                .WithMany(u => u.IssueEntries)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FeedbackEntry
        modelBuilder.Entity<FeedbackEntry>(entity =>
        {
            entity.HasIndex(f => f.UserId);
            entity.HasIndex(f => f.Date);
            entity.Property(f => f.Subject).HasMaxLength(200).IsRequired();
            entity.Property(f => f.Details).HasMaxLength(5000).IsRequired();
            entity.Property(f => f.Type)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(f => f.User)
                .WithMany(u => u.FeedbackEntries)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // NoteEntry
        modelBuilder.Entity<NoteEntry>(entity =>
        {
            entity.HasIndex(n => n.UserId);
            entity.HasIndex(n => n.Date);
            entity.Property(n => n.Title).HasMaxLength(200).IsRequired();
            entity.Property(n => n.Content).HasMaxLength(10000).IsRequired();

            entity.HasOne(n => n.User)
                .WithMany(u => u.NoteEntries)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // NoteTag
        modelBuilder.Entity<NoteTag>(entity =>
        {
            entity.HasIndex(nt => new { nt.NoteEntryId, nt.Tag }).IsUnique();
            entity.Property(nt => nt.Tag).HasMaxLength(50).IsRequired();

            entity.HasOne(nt => nt.NoteEntry)
                .WithMany(n => n.Tags)
                .HasForeignKey(nt => nt.NoteEntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Department
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasIndex(d => d.Name).IsUnique();
            entity.Property(d => d.Name).HasMaxLength(100).IsRequired();
            entity.Property(d => d.Description).HasMaxLength(500);
        });

        // Category
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(c => c.Name).IsUnique();
            entity.Property(c => c.Name).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(500);
        });
    }
}
