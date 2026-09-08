using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class NoteEntryConfiguration : IEntityTypeConfiguration<NoteEntry>
{
    public void Configure(EntityTypeBuilder<NoteEntry> builder)
    {
        builder.Property(n => n.Title).IsRequired().HasMaxLength(120);
        builder.Property(n => n.Content).IsRequired().HasMaxLength(10000);

        builder
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => new { n.UserId, n.EntryDate });
    }
}

public class NoteTagConfiguration : IEntityTypeConfiguration<NoteTag>
{
    public void Configure(EntityTypeBuilder<NoteTag> builder)
    {
        builder.Property(t => t.Name).IsRequired().HasMaxLength(40);

        builder
            .HasOne(t => t.NoteEntry)
            .WithMany(n => n.Tags)
            .HasForeignKey(t => t.NoteEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.NoteEntryId, t.Name }).IsUnique();
        builder.HasIndex(t => t.Name);
    }
}
