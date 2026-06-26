namespace OnboardingDiary.Application.Common.Auth;

public class SecurityOptions
{
    public const string SectionName = "Security";

    public int MaxFailedAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
}
