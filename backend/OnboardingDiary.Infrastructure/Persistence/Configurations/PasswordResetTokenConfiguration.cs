using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(t => t.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(t => t.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(t => t.Token).IsRequired().HasMaxLength(500);
        builder.HasIndex(t => t.Token);

        builder.Property(t => t.ExpiresAt).IsRequired();
        builder.Property(t => t.IsUsed).HasDefaultValue(false);

        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
