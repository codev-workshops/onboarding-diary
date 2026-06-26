using FluentValidation;
using OnboardingDiary.Application.Issues.Dtos;

namespace OnboardingDiary.Application.Issues.Validators;

public class EscalateIssueRequestValidator : AbstractValidator<EscalateIssueRequest>
{
    public EscalateIssueRequestValidator()
    {
        RuleFor(x => x.Message)
            .NotEmpty()
            .MaximumLength(2000);
    }
}
