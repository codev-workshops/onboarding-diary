#if DEBUG
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Api.Controllers;

/// <summary>
/// Test-only controller for seeding data. Compiled only in DEBUG builds
/// and further guarded by IsDevelopment() at runtime.
/// </summary>
[ApiController]
[Route("api/test")]
public class TestSeedController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHostEnvironment _env;

    public TestSeedController(AppDbContext db, IHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost("assign-manager")]
    public async Task<IActionResult> AssignManager([FromBody] AssignManagerRequest request)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var recruit = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.RecruitId);
        if (recruit == null)
            return NotFound(new { error = "Recruit not found" });

        recruit.ManagerId = request.ManagerId;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Manager assigned", recruitId = request.RecruitId, managerId = request.ManagerId });
    }

    [HttpPost("set-role")]
    public async Task<IActionResult> SetRole([FromBody] SetRoleRequest request)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null)
            return NotFound(new { error = "User not found" });

        user.Role = request.Role;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Role set", userId = request.UserId, role = request.Role.ToString() });
    }
}

public record AssignManagerRequest(Guid RecruitId, Guid ManagerId);
public record SetRoleRequest(Guid UserId, Role Role);
#endif
