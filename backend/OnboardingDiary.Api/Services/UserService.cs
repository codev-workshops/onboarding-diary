using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UserService(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<UserDto>> GetRecruitsAsync(CancellationToken cancellationToken = default)
    {
        var query = _db.Users.AsNoTracking().Include(u => u.Manager).AsQueryable();
        query = _currentUser.Role == UserRole.Admin
            ? query.Where(u => u.Role == UserRole.NewRecruit)
            : query.Where(u => u.ManagerId == _currentUser.Id);

        var users = await query.OrderBy(u => u.FullName).ToListAsync(cancellationToken);
        return users.Select(u => AuthService.Map(u, u.Manager?.FullName)).ToList();
    }

    public async Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _db.Users
            .AsNoTracking()
            .Include(u => u.Manager)
            .OrderBy(u => u.FullName)
            .ToListAsync(cancellationToken);
        return users.Select(u => AuthService.Map(u, u.Manager?.FullName)).ToList();
    }
}
