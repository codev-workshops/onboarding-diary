using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Users;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Users;

public class AuditLogger : IAuditLogger
{
    private readonly AppDbContext _context;
    private readonly ICurrentUser _currentUser;

    public AuditLogger(AppDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task LogAsync(string action, string entityName, string entityId, string? details = null)
    {
        var entry = new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(entry);
        await _context.SaveChangesAsync();
    }
}
