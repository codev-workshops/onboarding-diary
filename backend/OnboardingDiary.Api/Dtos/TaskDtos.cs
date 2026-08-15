using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Dtos;

public class TaskDto
{
    public int Id { get; init; }

    public int UserId { get; init; }

    public string UserName { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public TaskCategory Category { get; init; }

    public TaskEntryStatus Status { get; init; }

    public TaskPriority Priority { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime UpdatedAtUtc { get; init; }
}

public class SaveTaskRequest
{
    public DateTime Date { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public TaskCategory Category { get; set; }

    public TaskEntryStatus Status { get; set; }

    public TaskPriority Priority { get; set; }
}

public class TaskQuery : PagedQuery
{
    public TaskCategory? Category { get; set; }

    public TaskEntryStatus? Status { get; set; }
}
