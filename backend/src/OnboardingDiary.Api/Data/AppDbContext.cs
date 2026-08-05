using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

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
    }
}
