using FluentValidation;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Application.Tasks.Validators;

public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Date)
            .NotEmpty()
            .LessThanOrEqualTo(DateTime.UtcNow.Date.AddDays(1))
            .WithMessage("Date must not be in the future.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(100)
            .Must(t => t == t.Trim())
            .WithMessage("Title must not have leading or trailing whitespace.");

        RuleFor(x => x.Description)
            .MaximumLength(2000);

        RuleFor(x => x.Category)
            .IsInEnum()
            .WithMessage("Category must be a valid TaskCategory value.");

        RuleFor(x => x.Status)
            .IsInEnum()
            .WithMessage("Status must be a valid TaskStatus value.");

        RuleFor(x => x.Priority)
            .IsInEnum()
            .WithMessage("Priority must be a valid Priority value.");

        RuleFor(x => x.Description)
            .NotEmpty()
            .When(x => x.Status == TaskStatus.Completed)
            .WithMessage("Description is required when status is Completed.");
    }
}
