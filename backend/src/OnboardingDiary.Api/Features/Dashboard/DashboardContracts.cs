using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Dashboard;

public record TaskSummary(int Total, int Done, int Open, int CompletionPercentage);

public record IssueSummary(
    int Total,
    int Open,
    IReadOnlyDictionary<IssueSeverity, int> OpenBySeverity
);

public record ActivityItem(
    string Kind,
    int Id,
    DateOnly EntryDate,
    string Title,
    string Detail,
    DateTimeOffset UpdatedAt
);

public record DashboardResponse(
    int UserId,
    TaskSummary Tasks,
    IssueSummary Issues,
    int FeedbackCount,
    int NoteCount,
    IReadOnlyList<TaskResponse> RecentTasks,
    IReadOnlyList<ActivityItem> RecentActivity
);
