namespace OnboardingDiary.Application.Users;

public interface IAuditLogger
{
    Task LogAsync(string action, string entityName, string entityId, string? details = null);
}
