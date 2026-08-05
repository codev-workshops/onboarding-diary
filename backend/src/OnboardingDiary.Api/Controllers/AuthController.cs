using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ITokenService tokens) : ControllerBase
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Signup(SignupRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return Conflict(new ProblemDetails { Title = "An account with this email already exists." });
        }

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Department = request.Department.Trim(),
            StartDate = request.StartDate,
            Role = UserRole.NewRecruit
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Created($"/api/users/{user.Id}", new AuthResponse(tokens.CreateToken(user), UserResponse.From(user)));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !user.IsActive)
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid email or password." });
        }

        if (user.LockedOutUntil is { } until && until > DateTimeOffset.UtcNow)
        {
            return StatusCode(StatusCodes.Status423Locked,
                new ProblemDetails { Title = $"Account locked until {until:u} after too many failed attempts." });
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockedOutUntil = DateTimeOffset.UtcNow.Add(LockoutDuration);
                user.FailedLoginAttempts = 0;
            }
            await db.SaveChangesAsync();
            return Unauthorized(new ProblemDetails { Title = "Invalid email or password." });
        }

        user.FailedLoginAttempts = 0;
        user.LockedOutUntil = null;
        await db.SaveChangesAsync();

        return Ok(new AuthResponse(tokens.CreateToken(user), UserResponse.From(user)));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        return user is null ? NotFound() : Ok(UserResponse.From(user));
    }
}
