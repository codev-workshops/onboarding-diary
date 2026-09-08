namespace OnboardingDiary.Api.Domain;

/// <summary>One ordered step of a <see cref="ChecklistTemplate"/>.</summary>
public class ChecklistItem
{
    public int Id { get; set; }

    public int TemplateId { get; set; }

    public ChecklistTemplate? Template { get; set; }

    /// <summary>Zero-based and contiguous within a template.</summary>
    public int Position { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public TaskCategory Category { get; set; } = TaskCategory.Other;

    /// <summary>Days after the recruit's start date; day 0 is the start date itself.</summary>
    public int? DueOffsetDays { get; set; }
}
