using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Infrastructure.Persistence.Converters;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(u => u.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(u => u.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Name).IsRequired().HasMaxLength(100);

        builder.Property(u => u.Role)
            .HasConversion(new SnakeCaseEnumConverter<Domain.Enums.Role>())
            .HasMaxLength(20);

        builder.Property(u => u.Department).IsRequired().HasMaxLength(100);
        builder.Property(u => u.StartDate).IsRequired();
        builder.Property(u => u.AvatarUrl).HasMaxLength(500);
        builder.Property(u => u.IsActive).HasDefaultValue(true);

        builder.HasOne(u => u.Manager)
            .WithMany(u => u.Recruits)
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(u => u.Tasks)
            .WithOne(t => t.User)
            .HasForeignKey(t => t.UserId);

        builder.HasMany(u => u.Issues)
            .WithOne(i => i.User)
            .HasForeignKey(i => i.UserId);

        builder.HasMany(u => u.Feedback)
            .WithOne(f => f.User)
            .HasForeignKey(f => f.UserId);

        builder.HasMany(u => u.Notes)
            .WithOne(n => n.User)
            .HasForeignKey(n => n.UserId);
    }
}
