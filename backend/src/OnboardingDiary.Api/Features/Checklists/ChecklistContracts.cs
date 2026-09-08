using FluentValidation;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Checklists;

public record ChecklistItemRequest(
    string Title,
    string? Description,
    TaskCategory Category,
    int? DueOffsetDays
);

public record SaveChecklistTemplateRequest(
    string Name,
    string? Description,
    int? DepartmentId,
    bool IsActive,
    IReadOnlyList<ChecklistItemRequest> Items
);

public record ChecklistItemResponse(
    int Id,
    int Position,
    string Title,
    string? Description,
    TaskCategory Category,
    int? DueOffsetDays
)
{
    public static ChecklistItemResponse From(ChecklistItem item) =>
        new(item.Id, item.Position, item.Title, item.Description, item.Category, item.DueOffsetDays);
}

public record ChecklistTemplateResponse(
    int Id,
    string Name,
    string? Description,
    int? DepartmentId,
    string? DepartmentName,
    bool IsActive,
    int ItemCount,
    int AssignmentCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ChecklistItemResponse> Items
);

/// <summary>A template a recruit may apply, with whether they already did.</summary>
public record AvailableChecklistResponse(
    int TemplateId,
    string Name,
    string? Description,
    int ItemCount,
    bool Applied,
    int? AssignmentId,
    IReadOnlyList<ChecklistItemResponse> Items
);

public record ApplyChecklistRequest(int TemplateId);

/// <summary>
/// Progress of one assignment. The denominator is the assignment's remaining generated tasks, not
/// the template's current item list, because a template may be edited after it was applied.
/// </summary>
public record ChecklistProgressResponse(
    int AssignmentId,
    int TemplateId,
    string TemplateName,
    DateTimeOffset AppliedAt,
    int GeneratedTasks,
    int CompletedTasks,
    int CompletionPercentage
);

public record ApplyChecklistResponse(
    ChecklistProgressResponse Progress,
    IReadOnlyList<TaskResponse> Tasks
);

public record ChecklistAssignmentDetailResponse(
    ChecklistProgressResponse Progress,
    IReadOnlyList<TaskResponse> Tasks
);

public record ChecklistTemplateListQuery(
    string? Q,
    int? DepartmentId,
    bool? IsActive,
    int Page = 1,
    int PageSize = 20,
    string Sort = "name"
);

public static class ChecklistRules
{
    public const int MaxItemsPerTemplate = 50;

    public const int MaxDueOffsetDays = 365;

    /// <summary>Percentage of an assignment's generated tasks that are done; 0 when none remain.</summary>
    public static int CompletionPercentage(int generatedTasks, int completedTasks) =>
        generatedTasks == 0 ? 0 : (int)Math.Round(completedTasks * 100d / generatedTasks);

    /// <summary>Day 0 is the recruit's start date; today is the fallback when they have none.</summary>
    public static DateOnly ResolveEntryDate(DateOnly? startDate, DateOnly today, int? dueOffsetDays)
    {
        var resolved = (startDate ?? today).AddDays(dueOffsetDays ?? 0);
        return resolved > today ? today : resolved;
    }
}

public class ChecklistItemRequestValidator : AbstractValidator<ChecklistItemRequest>
{
    public ChecklistItemRequestValidator()
    {
        RuleFor(i => i.Title).NotEmpty().MinimumLength(3).MaximumLength(120);
        RuleFor(i => i.Description).MaximumLength(5000);
        RuleFor(i => i.Category).IsInEnum();
        RuleFor(i => i.DueOffsetDays)
            .InclusiveBetween(0, ChecklistRules.MaxDueOffsetDays)
            .When(i => i.DueOffsetDays.HasValue);
    }
}

public class SaveChecklistTemplateRequestValidator : AbstractValidator<SaveChecklistTemplateRequest>
{
    public SaveChecklistTemplateRequestValidator()
    {
        RuleFor(t => t.Name).NotEmpty().MinimumLength(3).MaximumLength(120);
        RuleFor(t => t.Description).MaximumLength(1000);
        RuleFor(t => t.Items)
            .NotEmpty()
            .WithMessage("A template needs at least one item.")
            .Must(items => items.Count <= ChecklistRules.MaxItemsPerTemplate)
            .WithMessage($"A template cannot have more than {ChecklistRules.MaxItemsPerTemplate} items.");
        RuleForEach(t => t.Items).SetValidator(new ChecklistItemRequestValidator());
    }
}

public class ApplyChecklistRequestValidator : AbstractValidator<ApplyChecklistRequest>
{
    public ApplyChecklistRequestValidator()
    {
        RuleFor(r => r.TemplateId).GreaterThan(0);
    }
}
