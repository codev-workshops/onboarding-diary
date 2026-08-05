using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> List(
        [FromQuery] UserRole? role,
        [FromQuery] string? department,
        [FromQuery] Guid? managerId)
    {
        var query = db.Users.AsNoTracking().AsQueryable();
        if (role is { } r) query = query.Where(u => u.Role == r);
        if (!string.IsNullOrWhiteSpace(department)) query = query.Where(u => u.Department == department);
        if (managerId is { } m) query = query.Where(u => u.ManagerId == m);

        var users = await query.OrderBy(u => u.FullName).ToListAsync();
        return Ok(users.Select(UserResponse.From).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Get(Guid id)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        var callerId = User.GetUserId();
        var callerRole = User.GetRole();
        var allowed = callerRole == UserRole.Admin
            || callerId == user.Id
            || (callerRole == UserRole.Manager && user.ManagerId == callerId);

        return allowed ? Ok(UserResponse.From(user)) : Forbid();
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateOwnProfile(UpdateProfileRequest request)
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null) return NotFound();

        user.FullName = request.FullName.Trim();
        user.Department = request.Department.Trim();
        user.StartDate = request.StartDate;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return Ok(UserResponse.From(user));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        if (request.ManagerId is { } managerId)
        {
            var manager = await db.Users.FindAsync(managerId);
            if (manager is null || manager.Role != UserRole.Manager)
            {
                return BadRequest(new ProblemDetails { Title = "ManagerId must reference an existing user with the Manager role." });
            }
        }

        user.FullName = request.FullName.Trim();
        user.Department = request.Department.Trim();
        user.StartDate = request.StartDate;
        user.Role = request.Role;
        user.ManagerId = request.Role == UserRole.NewRecruit ? request.ManagerId : null;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return Ok(UserResponse.From(user));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        user.IsActive = false;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:guid}/recruits")]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> Recruits(Guid id)
    {
        if (User.GetRole() != UserRole.Admin && User.GetUserId() != id) return Forbid();

        var recruits = await db.Users.AsNoTracking()
            .Where(u => u.ManagerId == id)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return Ok(recruits.Select(UserResponse.From).ToList());
    }
}
