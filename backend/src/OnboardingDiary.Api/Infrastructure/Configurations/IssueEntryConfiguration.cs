using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class IssueEntryConfiguration : IEntityTypeConfiguration<IssueEntry>
{
    public void Configure(EntityTypeBuilder<IssueEntry> builder)
    {
        builder.Property(i => i.Title).IsRequired().HasMaxLength(120);
        builder.Property(i => i.Description).HasMaxLength(5000);
        builder.Property(i => i.ResolutionNotes).HasMaxLength(5000);
        builder.Property(i => i.Severity).HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(i => i.User)
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => new { i.UserId, i.EntryDate });
        builder.HasIndex(i => new { i.UserId, i.Status });
    }
}
