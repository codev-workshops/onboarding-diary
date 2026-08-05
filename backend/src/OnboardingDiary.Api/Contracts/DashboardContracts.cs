namespace OnboardingDiary.Api.Contracts;

public record SearchResult(string Kind, Guid Id, string Title, string Snippet, DateOnly Date);

public record RecentActivity(string Kind, Guid Id, string Title, DateOnly Date, string Status);

public record DashboardSummary(
    int TotalTasks,
    int CompletedTasks,
    int InProgressTasks,
    int BlockedTasks,
    double CompletionRate,
    int OpenIssues,
    int TotalIssues,
    int FeedbackCount,
    int NoteCount,
    IReadOnlyDictionary<string, int> TasksByStatus,
    IReadOnlyDictionary<string, int> TasksByCategory,
    IReadOnlyDictionary<string, int> IssuesBySeverity,
    IReadOnlyDictionary<string, int> ActivityByWeek,
    IReadOnlyList<RecentActivity> RecentActivity);
