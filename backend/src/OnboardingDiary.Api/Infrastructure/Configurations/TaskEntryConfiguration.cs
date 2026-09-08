using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class TaskEntryConfiguration : IEntityTypeConfiguration<TaskEntry>
{
    public void Configure(EntityTypeBuilder<TaskEntry> builder)
    {
        builder.Property(t => t.Title).IsRequired().HasMaxLength(120);
        builder.Property(t => t.Description).HasMaxLength(5000);
        builder.Property(t => t.Category).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.UserId, t.EntryDate });
        builder.HasIndex(t => new { t.UserId, t.Status });
    }
}
