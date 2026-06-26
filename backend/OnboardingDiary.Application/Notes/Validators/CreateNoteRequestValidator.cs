using FluentValidation;
using OnboardingDiary.Application.Notes.Dtos;

namespace OnboardingDiary.Application.Notes.Validators;

public class CreateNoteRequestValidator : AbstractValidator<CreateNoteRequest>
{
    public CreateNoteRequestValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty()
            .WithMessage("Date is required.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(200)
            .Must(t => t is null || t == t.Trim())
            .WithMessage("Title must not have leading or trailing whitespace.");

        RuleFor(x => x.Content)
            .NotEmpty()
            .MinimumLength(1)
            .MaximumLength(10000);

        RuleFor(x => x.Tags)
            .Must(tags => tags == null || tags.Count <= 10)
            .WithMessage("Maximum 10 tags allowed.")
            .Must(tags => tags == null || tags.All(t => t.Length >= 1 && t.Length <= 30))
            .WithMessage("Each tag must be between 1 and 30 characters.")
            .Must(tags => tags == null || tags.All(t => System.Text.RegularExpressions.Regex.IsMatch(t, @"^[a-zA-Z0-9\-]+$")))
            .WithMessage("Tags may only contain alphanumeric characters and hyphens.");
    }
}
