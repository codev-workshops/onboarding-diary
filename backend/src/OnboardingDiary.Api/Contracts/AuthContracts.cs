using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Contracts;

public record SignupRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8), RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Password must contain at least one letter and one number.")] string Password,
    [Required, MinLength(2), MaxLength(100)] string FullName,
    [Required, MinLength(2), MaxLength(100)] string Department,
    [Required] DateOnly StartDate);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record UpdateProfileRequest(
    [Required, MinLength(2), MaxLength(100)] string FullName,
    [Required, MinLength(2), MaxLength(100)] string Department,
    [Required] DateOnly StartDate);

public record UpdateUserRequest(
    [Required, MinLength(2), MaxLength(100)] string FullName,
    [Required, MinLength(2), MaxLength(100)] string Department,
    [Required] DateOnly StartDate,
    [Required] UserRole Role,
    Guid? ManagerId,
    bool IsActive);

public record UserResponse(
    Guid Id,
    string Email,
    string FullName,
    UserRole Role,
    string Department,
    DateOnly StartDate,
    Guid? ManagerId,
    bool IsActive)
{
    public static UserResponse From(User user) => new(
        user.Id, user.Email, user.FullName, user.Role, user.Department,
        user.StartDate, user.ManagerId, user.IsActive);
}

public record AuthResponse(string Token, UserResponse User);
