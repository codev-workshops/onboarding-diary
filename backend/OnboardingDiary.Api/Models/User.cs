namespace OnboardingDiary.Api.Models;

public class User
{
    public int Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string PasswordSalt { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public string? Department { get; set; }

    public DateTime StartDate { get; set; }

    public int? ManagerId { get; set; }

    public User? Manager { get; set; }

    public ICollection<User> Recruits { get; set; } = new List<User>();

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TaskEntry> Tasks { get; set; } = new List<TaskEntry>();

    public ICollection<IssueEntry> Issues { get; set; } = new List<IssueEntry>();

    public ICollection<FeedbackNote> FeedbackNotes { get; set; } = new List<FeedbackNote>();

    public ICollection<AdditionalNote> AdditionalNotes { get; set; } = new List<AdditionalNote>();
}
