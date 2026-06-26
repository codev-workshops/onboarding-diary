using FluentValidation;
using OnboardingDiary.Application.Reports.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Reports.Validators;

public class GenerateReportRequestValidator : AbstractValidator<GenerateReportRequest>
{
    private static readonly HashSet<string> ValidCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "tasks", "issues", "feedback", "notes", "all"
    };

    public GenerateReportRequestValidator()
    {
        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("StartDate is required.");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("EndDate is required.")
            .GreaterThanOrEqualTo(x => x.StartDate).WithMessage("EndDate must be on or after StartDate.")
            .Must((req, endDate) => (endDate - req.StartDate).TotalDays <= 365)
            .WithMessage("Date range must not exceed 365 days.");

        RuleFor(x => x.Categories)
            .NotNull().WithMessage("Categories is required.")
            .Must(c => c != null && c.Count > 0).WithMessage("At least one category must be selected.")
            .Must(c => c != null && c.All(cat => ValidCategories.Contains(cat)))
            .WithMessage("Each category must be one of: tasks, issues, feedback, notes, or all.");

        RuleFor(x => x.Format)
            .IsInEnum().WithMessage("Format must be Pdf or Csv.");
    }
}
