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

    public DateTime StartDate { get; init; }

    public JourneyDto Journey { get; init; } = new();

    public ChecklistDto Checklist { get; init; } = new();
}

public class JourneyDto
{
    public DateTime StartDate { get; init; }

    public int DaysSinceStart { get; init; }

    public IReadOnlyList<JourneyStageDto> Stages { get; init; } = Array.Empty<JourneyStageDto>();
}

public class JourneyStageDto
{
    public string Key { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    public int Total { get; init; }

    public int NotStarted { get; init; }

    public int InProgress { get; init; }

    public int Blocked { get; init; }

    public int Completed { get; init; }

    public int CompletionPercent { get; init; }

    public string Status { get; init; } = string.Empty;

    public DateTime? FirstActivityDate { get; init; }

    public DateTime? LastActivityDate { get; init; }

    public int DayOffset { get; init; }
}

public class ChecklistDto
{
    public int Total { get; init; }

    public int Completed { get; init; }

    public int InProgress { get; init; }

    public int Pending { get; init; }

    public int ProgressPercent { get; init; }

    public IReadOnlyList<ChecklistItemDto> Items { get; init; } = Array.Empty<ChecklistItemDto>();
}

public class ChecklistItemDto
{
    public int Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string State { get; init; } = string.Empty;

    public bool IsBlocked { get; init; }
}

public class ManagerDashboardDto
{
    public int RecruitCount { get; init; }

    public IReadOnlyList<RecruitProgressDto> Recruits { get; init; } = Array.Empty<RecruitProgressDto>();

    public IssueSeverityCountsDto OpenIssuesBySeverity { get; init; } = new();

    public FeedbackCountsDto FeedbackCounts { get; init; } = new();

    public ManagerTotalsDto Totals { get; init; } = new();
}

public class RecruitProgressDto
{
    public int RecruitId { get; init; }

    public string RecruitName { get; init; } = string.Empty;

    public string? Department { get; init; }

    public DateTime StartDate { get; init; }

    public int TaskTotal { get; init; }

    public int TaskCompleted { get; init; }

    public int TaskCompletionPercent { get; init; }

    public int OpenIssues { get; init; }
}

public class IssueSeverityCountsDto
{
    public int Low { get; init; }

    public int Medium { get; init; }

    public int High { get; init; }

    public int Critical { get; init; }
}

public class ManagerTotalsDto
{
    public int Tasks { get; init; }

    public int CompletedTasks { get; init; }

    public int OpenIssues { get; init; }

    public int Notes { get; init; }
}

public class AdminDashboardDto
{
    public int UserCount { get; init; }

    public IReadOnlyList<LabelCountDto> UsersByRole { get; init; } = Array.Empty<LabelCountDto>();

    public IReadOnlyList<LabelCountDto> UsersByDepartment { get; init; } = Array.Empty<LabelCountDto>();

    public IReadOnlyList<WeeklyActivityDto> ActivityByWeek { get; init; } = Array.Empty<WeeklyActivityDto>();

    public EntryTotalsDto Totals { get; init; } = new();
}

public class LabelCountDto
{
    public string Label { get; init; } = string.Empty;

    public int Count { get; init; }
}

public class WeeklyActivityDto
{
    public DateTime WeekStartDate { get; init; }

    public int Tasks { get; init; }

    public int Issues { get; init; }

    public int Feedback { get; init; }

    public int Notes { get; init; }
}

public class EntryTotalsDto
{
    public int Tasks { get; init; }

    public int Issues { get; init; }

    public int Feedback { get; init; }

    public int Notes { get; init; }
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
