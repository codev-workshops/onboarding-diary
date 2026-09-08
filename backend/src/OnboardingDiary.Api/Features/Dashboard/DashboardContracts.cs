using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Dashboard;

public record TaskSummary(int Total, int Done, int Open, int CompletionPercentage);

public record DashboardResponse(
    int UserId,
    TaskSummary Tasks,
    IReadOnlyList<TaskResponse> RecentTasks
);
