using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Application.Tasks.Dtos;

public record TaskListQuery(
    int Page = 1,
    int Limit = 20,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    TaskCategory? Category = null,
    TaskStatus? Status = null,
    Priority? Priority = null,
    Guid? RecruitId = null);
