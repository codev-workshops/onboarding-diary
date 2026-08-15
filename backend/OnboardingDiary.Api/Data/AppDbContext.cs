using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<TaskEntry> Tasks => Set<TaskEntry>();

    public DbSet<IssueEntry> Issues => Set<IssueEntry>();

    public DbSet<FeedbackNote> Feedback => Set<FeedbackNote>();

    public DbSet<AdditionalNote> Notes => Set<AdditionalNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(200);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(150);
            entity.Property(u => u.Department).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.PasswordSalt).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(u => u.Manager)
                .WithMany(u => u.Recruits)
                .HasForeignKey(u => u.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskEntry>(entity =>
        {
            entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Description).HasMaxLength(2000);
            entity.Property(t => t.Category).HasConversion<string>().HasMaxLength(30);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(30);
            entity.Property(t => t.Priority).HasConversion<string>().HasMaxLength(30);
            entity.HasIndex(t => new { t.UserId, t.Date });
            entity.HasOne(t => t.User)
                .WithMany(u => u.Tasks)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IssueEntry>(entity =>
        {
            entity.Property(i => i.Title).IsRequired().HasMaxLength(200);
            entity.Property(i => i.Description).HasMaxLength(2000);
            entity.Property(i => i.ResolutionNotes).HasMaxLength(2000);
            entity.Property(i => i.Severity).HasConversion<string>().HasMaxLength(30);
            entity.Property(i => i.Status).HasConversion<string>().HasMaxLength(30);
            entity.HasIndex(i => new { i.UserId, i.Date });
            entity.HasOne(i => i.User)
                .WithMany(u => u.Issues)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeedbackNote>(entity =>
        {
            entity.Property(f => f.Subject).IsRequired().HasMaxLength(200);
            entity.Property(f => f.Details).HasMaxLength(2000);
            entity.Property(f => f.Type).HasConversion<string>().HasMaxLength(30);
            entity.HasIndex(f => new { f.UserId, f.Date });
            entity.HasOne(f => f.User)
                .WithMany(u => u.FeedbackNotes)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AdditionalNote>(entity =>
        {
            entity.Property(n => n.Title).IsRequired().HasMaxLength(200);
            entity.Property(n => n.Content).HasMaxLength(5000);
            entity.Property(n => n.Tags).HasMaxLength(400);
            entity.HasIndex(n => new { n.UserId, n.Date });
            entity.HasOne(n => n.User)
                .WithMany(u => u.AdditionalNotes)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
