using OnboardingDiary.Application.Tasks.Dtos;

namespace OnboardingDiary.Application.Dashboard.Dtos;

public record DashboardSummaryDto(
    TaskStatsDto TaskStats,
    IssueStatsDto IssueStats,
    FeedbackStatsDto FeedbackStats,
    NoteStatsDto NoteStats,
    RecentEntriesDto RecentEntries,
    IReadOnlyList<OpenIssueDto> OpenIssues);
