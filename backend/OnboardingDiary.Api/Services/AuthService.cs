using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ICurrentUser _currentUser;

    public AuthService(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICurrentUser currentUser)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _currentUser = currentUser;
    }

    public async Task<AuthResponse> SignupAsync(SignupRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            throw AppException.Conflict("An account with this email already exists.");
        }

        var (hash, salt) = _passwordHasher.Hash(request.Password);
        var user = new User
        {
            Email = email,
            PasswordHash = hash,
            PasswordSalt = salt,
            FullName = request.FullName.Trim(),
            Department = request.Department?.Trim(),
            Role = UserRole.NewRecruit,
            StartDate = (request.StartDate ?? DateTime.UtcNow).ToUtcDate(),
            ManagerId = await _db.Users
                .Where(u => u.Role == UserRole.Manager)
                .OrderBy(u => u.Id)
                .Select(u => (int?)u.Id)
                .FirstOrDefaultAsync(cancellationToken)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return BuildResponse(user, null);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.Manager)
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
        {
            throw AppException.Unauthorized("Invalid email or password.");
        }

        return BuildResponse(user, user.Manager?.FullName);
    }

    public async Task<UserDto> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.Manager)
            .FirstOrDefaultAsync(u => u.Id == _currentUser.Id, cancellationToken)
            ?? throw AppException.NotFound("User not found.");

        return Map(user, user.Manager?.FullName);
    }

    public static UserDto Map(User user, string? managerName) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Role = user.Role,
        Department = user.Department,
        StartDate = user.StartDate,
        ManagerId = user.ManagerId,
        ManagerName = managerName
    };

    private AuthResponse BuildResponse(User user, string? managerName)
    {
        var (token, expiresAtUtc) = _tokenService.CreateToken(user);
        return new AuthResponse
        {
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            User = Map(user, managerName)
        };
    }
}
