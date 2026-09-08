using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class ChecklistTemplateConfiguration : IEntityTypeConfiguration<ChecklistTemplate>
{
    public void Configure(EntityTypeBuilder<ChecklistTemplate> builder)
    {
        builder.Property(t => t.Name).IsRequired().HasMaxLength(120);
        builder.Property(t => t.Description).HasMaxLength(1000);

        builder
            .HasOne(t => t.Department)
            .WithMany()
            .HasForeignKey(t => t.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.Name).IsUnique();
    }
}

public class ChecklistItemConfiguration : IEntityTypeConfiguration<ChecklistItem>
{
    public void Configure(EntityTypeBuilder<ChecklistItem> builder)
    {
        builder.Property(i => i.Title).IsRequired().HasMaxLength(120);
        builder.Property(i => i.Description).HasMaxLength(5000);
        builder.Property(i => i.Category).HasConversion<string>().HasMaxLength(20);

        builder
            .HasOne(i => i.Template)
            .WithMany(t => t.Items)
            .HasForeignKey(i => i.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => new { i.TemplateId, i.Position });
    }
}

public class ChecklistAssignmentConfiguration : IEntityTypeConfiguration<ChecklistAssignment>
{
    public void Configure(EntityTypeBuilder<ChecklistAssignment> builder)
    {
        builder
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restricted rather than cascading: an applied template is retired, never deleted.
        builder
            .HasOne(a => a.Template)
            .WithMany()
            .HasForeignKey(a => a.TemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        // The database, not the service, is what makes a second application impossible.
        builder.HasIndex(a => new { a.UserId, a.TemplateId }).IsUnique();
    }
}
