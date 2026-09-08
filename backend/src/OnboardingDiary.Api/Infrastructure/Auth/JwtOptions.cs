namespace OnboardingDiary.Api.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "onboarding-diary";

    public string Audience { get; set; } = "onboarding-diary";

    public string Key { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 60;
}
