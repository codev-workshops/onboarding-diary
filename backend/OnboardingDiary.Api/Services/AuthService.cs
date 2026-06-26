using System.Security.Cryptography;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.DTOs.Auth;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Repositories;

namespace OnboardingDiary.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly JwtTokenGenerator _tokenGenerator;

    public AuthService(IUserRepository userRepository, JwtTokenGenerator tokenGenerator)
    {
        _userRepository = userRepository;
        _tokenGenerator = tokenGenerator;
    }

    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _userRepository.EmailExistsAsync(request.Email.ToLowerInvariant()))
            throw new InvalidOperationException("Email is already registered.");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRole.Recruit,
            Department = request.Department,
            StartDate = request.StartDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        return new RegisterResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            Department = user.Department,
            StartDate = user.StartDate,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is deactivated.");

        var token = _tokenGenerator.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            ExpiresIn = _tokenGenerator.GetExpiryInSeconds(),
            User = new AuthUserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString()
            }
        };
    }

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());

        if (user == null || !user.IsActive)
        {
            return new ForgotPasswordResponse
            {
                Message = "If the email is registered, a reset link has been sent.",
                Token = null
            };
        }

        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        user.PasswordResetToken = resetToken;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return new ForgotPasswordResponse
        {
            Message = "If the email is registered, a reset link has been sent.",
            Token = resetToken
        };
    }

    public async Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userRepository.GetByResetTokenAsync(request.Token);

        if (user == null)
            throw new ArgumentException("Invalid or expired reset token.");

        if (user.PasswordResetTokenExpiry == null || user.PasswordResetTokenExpiry < DateTime.UtcNow)
            throw new ArgumentException("Invalid or expired reset token.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return new ResetPasswordResponse
        {
            Message = "Password reset successfully."
        };
    }
}
