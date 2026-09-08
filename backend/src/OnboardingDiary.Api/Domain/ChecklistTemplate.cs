namespace OnboardingDiary.Api.Domain;

/// <summary>
/// An admin-defined onboarding checklist. A recruit applies one to themselves, which snapshots its
/// items into ordinary tasks; later edits therefore only reach future applications.
/// </summary>
public class ChecklistTemplate
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    /// <summary>Null means the template applies to every department.</summary>
    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ChecklistItem> Items { get; set; } = [];
}
