using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(rt => rt.Id);
        builder.Property(rt => rt.Id).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(rt => rt.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(rt => rt.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(rt => rt.Token).IsRequired().HasMaxLength(500);
        builder.HasIndex(rt => rt.Token);
        builder.Property(rt => rt.ExpiresAt).IsRequired();
        builder.Property(rt => rt.IsRevoked).HasDefaultValue(false);

        builder.HasOne(rt => rt.User)
            .WithMany()
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
