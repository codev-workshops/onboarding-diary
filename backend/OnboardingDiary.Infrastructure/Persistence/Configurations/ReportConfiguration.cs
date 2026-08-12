using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence.Converters;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(r => r.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(r => r.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(r => r.StartDate).IsRequired();
        builder.Property(r => r.EndDate).IsRequired();
        builder.Property(r => r.FileUrl).HasMaxLength(500);

        builder.Property(r => r.Format)
            .HasConversion(new SnakeCaseEnumConverter<ReportFormat>())
            .HasMaxLength(10);

        builder.Property(r => r.Categories)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default) ?? new List<string>())
            .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
                c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                c => c.ToList()));

        builder.HasOne(r => r.GeneratedByUser)
            .WithMany()
            .HasForeignKey(r => r.GeneratedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Recruit)
            .WithMany()
            .HasForeignKey(r => r.RecruitId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
