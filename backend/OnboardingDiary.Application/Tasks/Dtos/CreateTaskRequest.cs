using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Application.Tasks.Dtos;

public record CreateTaskRequest(
    DateTime Date,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskStatus Status,
    Priority Priority);
