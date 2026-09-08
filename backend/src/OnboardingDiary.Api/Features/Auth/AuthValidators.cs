using FluentValidation;

namespace OnboardingDiary.Api.Features.Auth;

public static class PasswordRules
{
    public static IRuleBuilderOptions<T, string> Password<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .MinimumLength(10)
            .WithMessage("Password must be at least 10 characters long.")
            .Matches("[A-Za-z]")
            .WithMessage("Password must contain at least one letter.")
            .Matches("[0-9]")
            .WithMessage("Password must contain at least one digit.");
}

public class SignupRequestValidator : AbstractValidator<SignupRequest>
{
    public SignupRequestValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(r => r.Password).Password();
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(150);
        RuleFor(r => r.DepartmentId).GreaterThan(0).When(r => r.DepartmentId.HasValue);
        RuleFor(r => r.StartDate).NotEqual(default(DateOnly));
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(r => r.Email).NotEmpty();
        RuleFor(r => r.Password).NotEmpty();
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(r => r.CurrentPassword).NotEmpty();
        RuleFor(r => r.NewPassword).Password();
    }
}
