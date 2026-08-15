using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class AccessService : IAccessService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AccessService(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<int> ResolveReadableUserIdAsync(int? recruitId, CancellationToken cancellationToken = default)
    {
        if (recruitId is null || recruitId == _currentUser.Id)
        {
            return _currentUser.Id;
        }

        await EnsureCanReadAsync(recruitId.Value, cancellationToken);
        return recruitId.Value;
    }

    public async Task EnsureCanReadAsync(int ownerUserId, CancellationToken cancellationToken = default)
    {
        if (ownerUserId == _currentUser.Id || _currentUser.Role == UserRole.Admin)
        {
            return;
        }

        if (_currentUser.Role == UserRole.Manager)
        {
            var isOverseen = await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == ownerUserId && u.ManagerId == _currentUser.Id, cancellationToken);
            if (isOverseen)
            {
                return;
            }
        }

        throw AppException.Forbidden();
    }

    public void EnsureCanWrite(int ownerUserId)
    {
        if (ownerUserId == _currentUser.Id || _currentUser.Role == UserRole.Admin)
        {
            return;
        }

        throw AppException.Forbidden("Only the owner can modify this entry.");
    }

    public async Task<IReadOnlyList<int>> GetOverseenUserIdsAsync(CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role == UserRole.Admin)
        {
            return await _db.Users.AsNoTracking().Select(u => u.Id).ToListAsync(cancellationToken);
        }

        var ids = await _db.Users
            .AsNoTracking()
            .Where(u => u.ManagerId == _currentUser.Id)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
        ids.Add(_currentUser.Id);
        return ids;
    }
}
