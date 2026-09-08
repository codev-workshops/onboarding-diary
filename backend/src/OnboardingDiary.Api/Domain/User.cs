namespace OnboardingDiary.Api.Domain;

public class User
{
    public int Id { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public required string FullName { get; set; }

    public UserRole Role { get; set; } = UserRole.Recruit;

    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    public DateOnly? StartDate { get; set; }

    public int? ManagerId { get; set; }

    public User? Manager { get; set; }

    public ICollection<User> Recruits { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
