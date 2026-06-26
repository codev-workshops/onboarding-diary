using FluentValidation;
using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Application.Auth.Validators;

public class LogoutRequestValidator : AbstractValidator<LogoutRequest>
{
    public LogoutRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty();
    }
}
