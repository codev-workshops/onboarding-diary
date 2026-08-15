using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Dtos;

public class SignupRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? Department { get; set; }

    public DateTime? StartDate { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; init; } = string.Empty;

    public DateTime ExpiresAtUtc { get; init; }

    public UserDto User { get; init; } = new();
}

public class UserDto
{
    public int Id { get; init; }

    public string Email { get; init; } = string.Empty;

    public string FullName { get; init; } = string.Empty;

    public UserRole Role { get; init; }

    public string? Department { get; init; }

    public DateTime StartDate { get; init; }

    public int? ManagerId { get; init; }

    public string? ManagerName { get; init; }
}
