using FluentValidation;

namespace OnboardingDiary.Api.Features.Profile;

public record UpdateProfileRequest(string FullName, int? DepartmentId, DateOnly? StartDate);

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(150);
        RuleFor(r => r.DepartmentId).GreaterThan(0).When(r => r.DepartmentId.HasValue);
    }
}

public record DepartmentResponse(int Id, string Name);
