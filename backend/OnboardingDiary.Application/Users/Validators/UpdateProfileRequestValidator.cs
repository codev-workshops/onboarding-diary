using FluentValidation;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Constants;

namespace OnboardingDiary.Application.Users.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.")
            .Matches(@"^[a-zA-Z\s\-']+$").WithMessage("Name may only contain letters, spaces, hyphens, and apostrophes.");

        RuleFor(x => x.Department)
            .NotEmpty().WithMessage("Department is required.")
            .Must(d => Departments.All.Contains(d)).WithMessage("Department must be one of the predefined values.");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required.")
            .Must(d => d <= DateTime.UtcNow.Date.AddDays(30))
            .WithMessage("Start date cannot be more than 30 days in the future.")
            .Must(d => d >= DateTime.UtcNow.Date.AddYears(-1))
            .WithMessage("Start date cannot be more than 1 year in the past.");

        RuleFor(x => x.AvatarUrl)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var uri)
                         && (uri.Scheme == "http" || uri.Scheme == "https"))
            .When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl))
            .WithMessage("Avatar URL must be a valid HTTP or HTTPS URL.");
    }
}
