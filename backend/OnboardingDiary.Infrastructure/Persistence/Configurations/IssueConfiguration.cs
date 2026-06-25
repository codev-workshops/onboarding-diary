using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence.Converters;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class IssueConfiguration : IEntityTypeConfiguration<Issue>
{
    public void Configure(EntityTypeBuilder<Issue> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(i => i.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(i => i.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(i => i.Title).IsRequired().HasMaxLength(150);
        builder.Property(i => i.Description).IsRequired().HasMaxLength(3000);
        builder.Property(i => i.Date).IsRequired();
        builder.Property(i => i.ResolutionNotes).HasMaxLength(3000);

        builder.Property(i => i.Severity)
            .HasConversion(new SnakeCaseEnumConverter<IssueSeverity>())
            .HasMaxLength(20);

        builder.Property(i => i.Status)
            .HasConversion(new SnakeCaseEnumConverter<IssueStatus>())
            .HasMaxLength(20);

        builder.Property(i => i.IsEscalated).HasDefaultValue(false);
        builder.Property(i => i.IsDeleted).HasDefaultValue(false);

        builder.HasOne(i => i.User)
            .WithMany(u => u.Issues)
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
