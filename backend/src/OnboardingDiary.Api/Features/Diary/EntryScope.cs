using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Diary;

public record Caller(int UserId, UserRole Role);

public enum EntryAccess
{
    Allowed,
    Denied,
}

/// <summary>
/// Decides whose diary entries a caller may read. Recruits only ever see their own; managers see
/// the recruits assigned to them; admins see anyone. Managers and admins own no entries of their
/// own, so asking for their own scope is denied.
/// </summary>
public class EntryScopeService(AppDbContext db)
{
    public async Task<(EntryAccess Access, int UserId)> ResolveAsync(
        Caller caller,
        int? requestedUserId,
        CancellationToken cancellationToken = default
    )
    {
        var userId = requestedUserId ?? caller.UserId;

        if (caller.Role == UserRole.Admin)
        {
            return (EntryAccess.Allowed, userId);
        }

        if (userId == caller.UserId)
        {
            return caller.Role == UserRole.Recruit
                ? (EntryAccess.Allowed, userId)
                : (EntryAccess.Denied, userId);
        }

        var assigned =
            caller.Role == UserRole.Manager
            && await db.Users.AnyAsync(
                u => u.Id == userId && u.ManagerId == caller.UserId,
                cancellationToken
            );

        return (assigned ? EntryAccess.Allowed : EntryAccess.Denied, userId);
    }
}
