using System.Text.Json.Serialization;

namespace OnboardingDiary.Api.Domain;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    NewRecruit,
    Manager,
    Admin
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.NewRecruit;
    public string Department { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public Guid? ManagerId { get; set; }
    public User? Manager { get; set; }
    public ICollection<User> Recruits { get; set; } = [];
    public bool IsActive { get; set; } = true;
    public int FailedLoginAttempts { get; set; }
    public DateTimeOffset? LockedOutUntil { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
