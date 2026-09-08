namespace OnboardingDiary.Api.Domain;

public class TaskEntry
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateOnly EntryDate { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public TaskCategory Category { get; set; } = TaskCategory.Other;

    public TaskEntryStatus Status { get; set; } = TaskEntryStatus.Todo;

    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
