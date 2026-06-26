using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence.Converters;
using FeedbackEntity = OnboardingDiary.Domain.Entities.Feedback;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class FeedbackConfiguration : IEntityTypeConfiguration<FeedbackEntity>
{
    public void Configure(EntityTypeBuilder<FeedbackEntity> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(f => f.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(f => f.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(f => f.Subject).IsRequired().HasMaxLength(200);
        builder.Property(f => f.Details).IsRequired().HasMaxLength(5000);
        builder.Property(f => f.Date).IsRequired();

        builder.Property(f => f.Type)
            .HasConversion(new SnakeCaseEnumConverter<FeedbackType>())
            .HasMaxLength(20);

        builder.Property(f => f.IsDeleted).HasDefaultValue(false);

        builder.HasOne(f => f.User)
            .WithMany(u => u.Feedback)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
