using FluentValidation;
using OnboardingDiary.Application.Feedback.Dtos;

namespace OnboardingDiary.Application.Feedback.Validators;

public class UpdateFeedbackRequestValidator : AbstractValidator<UpdateFeedbackRequest>
{
    public UpdateFeedbackRequestValidator()
    {
        RuleFor(x => x.Subject)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(150)
            .Must(s => s == s.Trim())
            .WithMessage("Subject must not have leading or trailing whitespace.");

        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Type must be a valid FeedbackType value.");

        RuleFor(x => x.Details)
            .NotEmpty()
            .MinimumLength(20)
            .MaximumLength(5000);
    }
}
