using FluentValidation;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Issues.Validators;

public class CreateIssueRequestValidator : AbstractValidator<CreateIssueRequest>
{
    public CreateIssueRequestValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty()
            .LessThanOrEqualTo(DateTime.UtcNow.Date.AddDays(1))
            .WithMessage("Date must not be in the future.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(150)
            .Must(t => t == t.Trim())
            .WithMessage("Title must not have leading or trailing whitespace.");

        RuleFor(x => x.Description)
            .NotEmpty()
            .MinimumLength(10)
            .MaximumLength(3000);

        RuleFor(x => x.Severity)
            .IsInEnum()
            .WithMessage("Severity must be a valid IssueSeverity value.");

        RuleFor(x => x.Status)
            .IsInEnum()
            .WithMessage("Status must be a valid IssueStatus value.");

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Description) || (x.Status != IssueStatus.Resolved && x.Status != IssueStatus.Closed))
            .WithName("Description")
            .WithMessage("Resolution notes or description is required when status is Resolved or Closed.")
            .When(x => x.Status == IssueStatus.Resolved || x.Status == IssueStatus.Closed);
    }
}
