using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Infrastructure;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Features.Auth;

public enum SignupStatus
{
    Created,
    EmailAlreadyRegistered,
    UnknownDepartment,
}

public enum ChangePasswordStatus
{
    Changed,
    IncorrectCurrentPassword,
    UserNotFound,
}

public class AuthService(
    AppDbContext db,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokens,
    TimeProvider timeProvider
)
{
    public async Task<(SignupStatus Status, AuthResponse? Response)> SignupAsync(
        SignupRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var email = Normalize(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return (SignupStatus.EmailAlreadyRegistered, null);
        }

        Department? department = null;
        if (request.DepartmentId is { } departmentId)
        {
            department = await db.Departments.FirstOrDefaultAsync(
                d => d.Id == departmentId && d.IsActive,
                cancellationToken
            );

            if (department is null)
            {
                return (SignupStatus.UnknownDepartment, null);
            }
        }

        var now = timeProvider.GetUtcNow();
        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = string.Empty,
            Role = UserRole.Recruit,
            DepartmentId = department?.Id,
            Department = department,
            StartDate = request.StartDate,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return (SignupStatus.Created, CreateAuthResponse(user));
    }

    public async Task<AuthResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var email = Normalize(request.Email);
        var user = await db
            .Users.Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null || !user.IsActive)
        {
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password
        );

        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            user.UpdatedAt = timeProvider.GetUtcNow();
            await db.SaveChangesAsync(cancellationToken);
        }

        return CreateAuthResponse(user);
    }

    public async Task<ChangePasswordStatus> ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return ChangePasswordStatus.UserNotFound;
        }

        var verification = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.CurrentPassword
        );

        if (verification == PasswordVerificationResult.Failed)
        {
            return ChangePasswordStatus.IncorrectCurrentPassword;
        }

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = timeProvider.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);

        return ChangePasswordStatus.Changed;
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var (token, expiresAt) = tokens.CreateAccessToken(user);
        return new AuthResponse(token, expiresAt, UserProfileResponse.From(user));
    }

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
