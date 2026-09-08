using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class FeedbackEntryConfiguration : IEntityTypeConfiguration<FeedbackEntry>
{
    public void Configure(EntityTypeBuilder<FeedbackEntry> builder)
    {
        builder.Property(f => f.Title).IsRequired().HasMaxLength(120);
        builder.Property(f => f.Message).IsRequired().HasMaxLength(5000);
        builder.Property(f => f.Type).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => new { f.UserId, f.EntryDate });
        builder.HasIndex(f => new { f.UserId, f.Type });
    }
}
