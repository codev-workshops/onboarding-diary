namespace OnboardingDiary.Api.Dtos;

public class DashboardSummaryDto
{
    public int RecruitId { get; init; }

    public string RecruitName { get; init; } = string.Empty;

    public TaskCountsDto TaskCounts { get; init; } = new();

    public int TaskCompletionPercent { get; init; }

    public IssueCountsDto IssueCounts { get; init; } = new();

    public FeedbackCountsDto FeedbackCounts { get; init; } = new();

    public int NotesCount { get; init; }

    public IReadOnlyList<ActivityItemDto> RecentActivity { get; init; } = Array.Empty<ActivityItemDto>();
}

public class TaskCountsDto
{
    public int Total { get; init; }

    public int NotStarted { get; init; }

    public int InProgress { get; init; }

    public int Blocked { get; init; }

    public int Completed { get; init; }
}

public class IssueCountsDto
{
    public int Total { get; init; }

    public int Open { get; init; }

    public int InProgress { get; init; }

    public int Resolved { get; init; }

    public int Closed { get; init; }
}

public class FeedbackCountsDto
{
    public int Total { get; init; }

    public int Positive { get; init; }

    public int Suggestion { get; init; }

    public int Concern { get; init; }
}

public class ActivityItemDto
{
    public string Type { get; init; } = string.Empty;

    public int Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string? Status { get; init; }
}
