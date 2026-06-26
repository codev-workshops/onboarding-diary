using FluentValidation;
using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Application.Auth.Validators;

public class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty();
    }
}
