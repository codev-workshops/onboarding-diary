using FluentValidation;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Features.Admin;

public record AdminUserResponse(
    int Id,
    string Email,
    string FullName,
    UserRole Role,
    int? DepartmentId,
    string? DepartmentName,
    int? ManagerId,
    string? ManagerName,
    DateOnly? StartDate,
    bool IsActive,
    DateTimeOffset CreatedAt
)
{
    public static AdminUserResponse From(User user) =>
        new(
            user.Id,
            user.Email,
            user.FullName,
            user.Role,
            user.DepartmentId,
            user.Department?.Name,
            user.ManagerId,
            user.Manager?.FullName,
            user.StartDate,
            user.IsActive,
            user.CreatedAt
        );
}

public record AdminUserListQuery(
    string? Q,
    UserRole? Role,
    int? DepartmentId,
    int? ManagerId,
    bool? IsActive,
    int Page = 1,
    int PageSize = 20,
    string Sort = "name"
);

public record CreateUserRequest(
    string Email,
    string Password,
    string FullName,
    UserRole Role,
    int? DepartmentId,
    int? ManagerId,
    DateOnly? StartDate
);

public record UpdateUserRequest(
    string FullName,
    UserRole Role,
    int? DepartmentId,
    int? ManagerId,
    DateOnly? StartDate,
    bool IsActive
);

public record AdminStatsResponse(
    int TotalUsers,
    int ActiveUsers,
    int Recruits,
    int Managers,
    int Admins,
    int UnassignedRecruits,
    int TaskCount,
    int OpenIssueCount
);

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(r => r.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(150);
        RuleFor(r => r.Role).IsInEnum();
        RuleFor(r => r.DepartmentId).GreaterThan(0).When(r => r.DepartmentId.HasValue);
        RuleFor(r => r.ManagerId).GreaterThan(0).When(r => r.ManagerId.HasValue);
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(150);
        RuleFor(r => r.Role).IsInEnum();
        RuleFor(r => r.DepartmentId).GreaterThan(0).When(r => r.DepartmentId.HasValue);
        RuleFor(r => r.ManagerId).GreaterThan(0).When(r => r.ManagerId.HasValue);
    }
}
