using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Auth;

/// Decides which users' entries the caller may read, per the role rules in the spec.
public class EntryAccess(AppDbContext db)
{
    /// Resolves the owner whose entries are being requested, or null when the caller may not see them.
    public async Task<Guid?> ResolveReadableOwnerAsync(ClaimsPrincipal principal, Guid? requestedUserId)
    {
        var callerId = principal.GetUserId();
        var ownerId = requestedUserId ?? callerId;
        return await CanReadAsync(principal, ownerId) ? ownerId : null;
    }

    public async Task<bool> CanReadAsync(ClaimsPrincipal principal, Guid ownerId)
    {
        var callerId = principal.GetUserId();
        if (callerId == ownerId || principal.GetRole() == UserRole.Admin) return true;
        if (principal.GetRole() != UserRole.Manager) return false;

        return await db.Users.AnyAsync(u => u.Id == ownerId && u.ManagerId == callerId);
    }
}
