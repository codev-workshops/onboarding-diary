using Mapster;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Common.Auth;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Common.Security;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Auth;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailSender _emailSender;
    private readonly SecurityOptions _securityOptions;
    private readonly ISanitizer _sanitizer;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IEmailSender emailSender,
        IOptions<SecurityOptions> securityOptions,
        ISanitizer sanitizer)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _emailSender = emailSender;
        _securityOptions = securityOptions.Value;
        _sanitizer = sanitizer;
    }

    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request)
    {
        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
            throw new BusinessRuleException("A user with this email already exists.");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Name = _sanitizer.Sanitize(request.Name.Trim()),
            Department = _sanitizer.Sanitize(request.Department.Trim()),
            StartDate = request.StartDate,
            Role = Role.Recruit,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _emailSender.SendAsync(
            user.Email,
            "Welcome to Onboarding Diary",
            $"Hi {user.Name}, your account has been created. Please log in to get started.");

        return new RegisterResponse(user.Id, user.Email, user.Name, user.Role.ToString());
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user is null)
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
            throw new BusinessRuleException(
                $"Account is locked. Try again after {user.LockoutEnd.Value:u}.");

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value <= DateTime.UtcNow)
        {
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;

            if (user.FailedLoginAttempts >= _securityOptions.MaxFailedAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(_securityOptions.LockoutMinutes);
                await _context.SaveChangesAsync();
                throw new BusinessRuleException(
                    $"Account is locked due to {_securityOptions.MaxFailedAttempts} failed attempts. Try again after {user.LockoutEnd.Value:u}.");
            }

            await _context.SaveChangesAsync();
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        var accessToken = _jwtTokenService.CreateAccessToken(user);
        var (rawRefreshToken, refreshTokenEntity) = _jwtTokenService.CreateRefreshToken(user.Id);

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync();

        var userDto = user.Adapt<UserDto>();
        return new LoginResponse(accessToken, rawRefreshToken, userDto);
    }

    public async Task<RefreshResponse> RefreshAsync(RefreshRequest request)
    {
        var existingToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (existingToken is null || existingToken.IsRevoked || existingToken.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        existingToken.IsRevoked = true;
        existingToken.RevokedAt = DateTime.UtcNow;

        var accessToken = _jwtTokenService.CreateAccessToken(existingToken.User);
        var (rawRefreshToken, newRefreshTokenEntity) = _jwtTokenService.CreateRefreshToken(existingToken.UserId);

        _context.RefreshTokens.Add(newRefreshTokenEntity);
        await _context.SaveChangesAsync();

        return new RefreshResponse(accessToken, rawRefreshToken);
    }

    public async Task LogoutAsync(LogoutRequest request)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (token is not null)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user is not null)
        {
            var resetToken = new PasswordResetToken
            {
                UserId = user.Id,
                Token = Guid.NewGuid().ToString("N"),
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            await _emailSender.SendAsync(
                user.Email,
                "Password Reset Request",
                $"Use this token to reset your password: {resetToken.Token}. It expires in 24 hours.");
        }
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token);

        if (resetToken is null || resetToken.IsUsed || resetToken.ExpiresAt <= DateTime.UtcNow)
            throw new BusinessRuleException("Invalid or expired reset token.");

        resetToken.User.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;

        var userRefreshTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == resetToken.UserId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var rt in userRefreshTokens)
        {
            rt.IsRevoked = true;
            rt.RevokedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }
}
