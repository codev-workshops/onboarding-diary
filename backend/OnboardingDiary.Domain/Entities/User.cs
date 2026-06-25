using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Domain.Entities;

public class User : AuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Role Role { get; set; } = Role.Recruit;
    public string Department { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public string? AvatarUrl { get; set; }
    public Guid? ManagerId { get; set; }
    public User? Manager { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<TaskEntity> Tasks { get; set; } = new List<TaskEntity>();
    public ICollection<Issue> Issues { get; set; } = new List<Issue>();
    public ICollection<Feedback> Feedback { get; set; } = new List<Feedback>();
    public ICollection<Note> Notes { get; set; } = new List<Note>();
    public ICollection<User> Recruits { get; set; } = new List<User>();
}
