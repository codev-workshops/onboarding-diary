using FluentValidation;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Constants;

namespace OnboardingDiary.Application.Auth.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .MaximumLength(254)
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.Name)
            .NotEmpty()
            .Length(2, 100)
            .Matches(@"^[a-zA-Z\s\-']+$").WithMessage("Name may only contain letters, spaces, hyphens, and apostrophes.");

        RuleFor(x => x.Department)
            .NotEmpty()
            .Must(d => Departments.All.Contains(d))
            .WithMessage("Department must be one of the allowed values.");

        RuleFor(x => x.StartDate)
            .NotEmpty()
            .LessThanOrEqualTo(DateTime.UtcNow.AddDays(30)).WithMessage("Start date cannot be more than 30 days in the future.")
            .GreaterThanOrEqualTo(DateTime.UtcNow.AddYears(-1)).WithMessage("Start date cannot be more than 1 year in the past.");
    }
}
