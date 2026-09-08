using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Features.Auth;

public record SignupRequest(
    string Email,
    string Password,
    string FullName,
    int? DepartmentId,
    DateOnly StartDate
);

public record LoginRequest(string Email, string Password);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UserProfileResponse(
    int Id,
    string Email,
    string FullName,
    UserRole Role,
    int? DepartmentId,
    string? DepartmentName,
    DateOnly? StartDate
)
{
    public static UserProfileResponse From(User user) =>
        new(
            user.Id,
            user.Email,
            user.FullName,
            user.Role,
            user.DepartmentId,
            user.Department?.Name,
            user.StartDate
        );
}

public record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt, UserProfileResponse User);
