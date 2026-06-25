using Mapster;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Users;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Users;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IEmailSender _emailSender;
    private readonly IAuditLogger _auditLogger;

    public UserService(
        AppDbContext context,
        ICurrentUser currentUser,
        IEmailSender emailSender,
        IAuditLogger auditLogger)
    {
        _context = context;
        _currentUser = currentUser;
        _emailSender = emailSender;
        _auditLogger = auditLogger;
    }

    public async Task<UserDto> GetCurrentUserAsync()
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var user = await _context.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        return user.Adapt<UserDto>();
    }

    public async Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var user = await _context.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        user.Name = request.Name;
        user.Department = request.Department;
        user.StartDate = request.StartDate;
        user.AvatarUrl = request.AvatarUrl;

        await _context.SaveChangesAsync();

        return user.Adapt<UserDto>();
    }

    public async Task<PagedResult<UserListItemDto>> ListUsersAsync(
        int page, int limit, string? search, Role? role, string? department)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        var query = _context.Users.IgnoreQueryFilters().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
        }

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(u => u.Department == department);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(u => new UserListItemDto(
                u.Id,
                u.Name,
                u.Email,
                u.Role.ToString(),
                u.Department,
                u.StartDate,
                u.IsActive))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling((double)total / limit);

        return new PagedResult<UserListItemDto>(items, total, page, limit, totalPages);
    }

    public async Task<UserDto> UpdateRoleAsync(Guid userId, Role role)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var oldRole = user.Role;
        user.Role = role;
        await _context.SaveChangesAsync();

        await _emailSender.SendAsync(
            user.Email,
            "Your Role Has Been Updated",
            $"Hi {user.Name}, your role has been changed from {oldRole} to {role}.");

        await _auditLogger.LogAsync(
            "RoleChanged",
            "User",
            userId.ToString(),
            $"Role changed from {oldRole} to {role}");

        return user.Adapt<UserDto>();
    }

    public async Task DeactivateUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        user.IsActive = false;
        await _context.SaveChangesAsync();

        var tokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        if (tokens.Count > 0)
            await _context.SaveChangesAsync();

        await _auditLogger.LogAsync(
            "UserDeactivated",
            "User",
            userId.ToString(),
            $"User '{user.Name}' ({user.Email}) deactivated");
    }
}
