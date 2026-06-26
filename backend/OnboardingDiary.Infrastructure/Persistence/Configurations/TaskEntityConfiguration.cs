using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence.Converters;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class TaskEntityConfiguration : IEntityTypeConfiguration<TaskEntity>
{
    public void Configure(EntityTypeBuilder<TaskEntity> builder)
    {
        builder.ToTable("Tasks");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(t => t.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(t => t.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(t => t.Title).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Description).HasMaxLength(2000);
        builder.Property(t => t.Date).IsRequired();

        builder.Property(t => t.Category)
            .HasConversion(new SnakeCaseEnumConverter<TaskCategory>())
            .HasMaxLength(20);

        builder.Property(t => t.Status)
            .HasConversion(new SnakeCaseEnumConverter<TaskStatus>())
            .HasMaxLength(20);

        builder.Property(t => t.Priority)
            .HasConversion(new SnakeCaseEnumConverter<Priority>())
            .HasMaxLength(20);

        builder.Property(t => t.IsDeleted).HasDefaultValue(false);

        builder.HasOne(t => t.User)
            .WithMany(u => u.Tasks)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
