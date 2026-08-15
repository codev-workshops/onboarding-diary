using FluentValidation;

namespace OnboardingDiary.Api.Validation;

public static class CommonRules
{
    public static readonly DateTime MinDate = new(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static IRuleBuilderOptions<T, DateTime> ValidEntryDate<T>(this IRuleBuilder<T, DateTime> rule) =>
        rule.NotEmpty()
            .WithMessage("Date is required.")
            .Must(date => date.Date >= MinDate.Date && date.Date <= DateTime.UtcNow.Date.AddDays(1))
            .WithMessage("Date must be on or after 2000-01-01 and not more than one day in the future.");

    public static IRuleBuilderOptions<T, string> RequiredTitle<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Title is required.").MaximumLength(200);
}
