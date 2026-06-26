using FluentValidation;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Users.Validators;

public class UpdateRoleRequestValidator : AbstractValidator<UpdateRoleRequest>
{
    public UpdateRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Role must be a valid role value.");
    }
}
