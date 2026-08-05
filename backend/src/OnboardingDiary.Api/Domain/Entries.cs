using System.Text.Json.Serialization;

namespace OnboardingDiary.Api.Domain;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskCategory
{
    Training,
    Setup,
    Meeting,
    ProjectWork,
    Documentation,
    Other
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskStatus
{
    NotStarted,
    InProgress,
    Completed,
    Blocked
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskPriority
{
    Low,
    Medium,
    High
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum IssueSeverity
{
    Low,
    Medium,
    High,
    Critical
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum IssueStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FeedbackType
{
    Positive,
    Suggestion,
    Concern
}

/// Fields shared by every diary entry type.
public abstract class DiaryEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateOnly Date { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class TaskEntry : DiaryEntry
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskCategory Category { get; set; }
    public TaskStatus Status { get; set; }
    public TaskPriority Priority { get; set; }
}

public class IssueEntry : DiaryEntry
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; }
    public IssueStatus Status { get; set; }
    public string? ResolutionNotes { get; set; }
}

public class FeedbackNote : DiaryEntry
{
    public string Subject { get; set; } = string.Empty;
    public FeedbackType Type { get; set; }
    public string Details { get; set; } = string.Empty;
}

public class Note : DiaryEntry
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
}
