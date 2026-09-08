namespace OnboardingDiary.Api.Domain;

/// <summary>
/// Records that a recruit applied a template. It is unique per (user, template) and outlives the
/// tasks it generated, so deleting those tasks never makes the template applicable again.
/// </summary>
public class ChecklistAssignment
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public int TemplateId { get; set; }

    public ChecklistTemplate? Template { get; set; }

    public DateTimeOffset AppliedAt { get; set; }

    public ICollection<TaskEntry> Tasks { get; set; } = [];
}
