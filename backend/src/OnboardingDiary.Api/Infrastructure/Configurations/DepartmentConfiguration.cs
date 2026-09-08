using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Configurations;

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.Property(d => d.Name).IsRequired().HasMaxLength(100);
        builder.HasIndex(d => d.Name).IsUnique();
    }
}
