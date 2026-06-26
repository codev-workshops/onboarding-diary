namespace OnboardingDiary.Api.DTOs.Auth;

public class RegisterResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
