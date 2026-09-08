using FluentValidation;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Features.Tasks;

public record CreateTaskRequest(
    DateOnly EntryDate,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskEntryStatus Status,
    TaskPriority Priority
);

public record UpdateTaskRequest(
    DateOnly EntryDate,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskEntryStatus Status,
    TaskPriority Priority
);

public record TaskResponse(
    int Id,
    int UserId,
    DateOnly EntryDate,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskEntryStatus Status,
    TaskPriority Priority,
    int? ChecklistAssignmentId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
)
{
    public static TaskResponse From(TaskEntry task) =>
        new(
            task.Id,
            task.UserId,
            task.EntryDate,
            task.Title,
            task.Description,
            task.Category,
            task.Status,
            task.Priority,
            task.ChecklistAssignmentId,
            task.CreatedAt,
            task.UpdatedAt
        );
}

public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public record TaskListQuery(
    DateOnly? From,
    DateOnly? To,
    TaskCategory? Category,
    TaskEntryStatus? Status,
    TaskPriority? Priority,
    string? Q,
    int? UserId,
    int Page = 1,
    int PageSize = 20,
    string Sort = "-entry_date"
);

public static class TaskEntryRules
{
    public const int MaxPageSize = 100;

    public static IRuleBuilderOptions<T, DateOnly> EntryDate<T>(
        this IRuleBuilder<T, DateOnly> rule,
        TimeProvider timeProvider
    )
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        return rule.NotEqual(default(DateOnly))
            .LessThanOrEqualTo(today)
            .WithMessage("Entry date cannot be in the future.")
            .GreaterThanOrEqualTo(today.AddDays(-365))
            .WithMessage("Entry date cannot be more than 365 days in the past.");
    }

    public static IRuleBuilderOptions<T, string> Title<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MinimumLength(3).MaximumLength(120);
}

public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Description).MaximumLength(5000);
        RuleFor(r => r.Category).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
    }
}

public class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    public UpdateTaskRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Description).MaximumLength(5000);
        RuleFor(r => r.Category).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
    }
}
