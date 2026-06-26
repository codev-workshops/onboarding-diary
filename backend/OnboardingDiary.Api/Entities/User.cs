using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Entities;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Recruit;
    public string Department { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public int? ManagerId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? Manager { get; set; }
    public ICollection<User> Recruits { get; set; } = new List<User>();
    public ICollection<TaskEntry> TaskEntries { get; set; } = new List<TaskEntry>();
    public ICollection<IssueEntry> IssueEntries { get; set; } = new List<IssueEntry>();
    public ICollection<FeedbackEntry> FeedbackEntries { get; set; } = new List<FeedbackEntry>();
    public ICollection<NoteEntry> NoteEntries { get; set; } = new List<NoteEntry>();
}
