using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.UnitTests;

public class JwtTokenServiceTests
{
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    [Fact]
    public void Access_token_carries_the_identity_claims_and_the_configured_lifetime()
    {
        var now = new DateTimeOffset(2026, 3, 1, 9, 0, 0, TimeSpan.Zero);
        var service = new JwtTokenService(
            Options.Create(
                new JwtOptions
                {
                    Issuer = "onboarding-diary",
                    Audience = "onboarding-diary",
                    Key = "unit-test-signing-key-unit-test-signing-key",
                    AccessTokenMinutes = 60,
                }
            ),
            new FixedTimeProvider(now)
        );

        var user = new User
        {
            Id = 42,
            Email = "recruit@example.com",
            FullName = "Ada Lovelace",
            PasswordHash = "hash",
            Role = UserRole.Manager,
        };

        var (token, expiresAt) = service.CreateAccessToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(now.AddMinutes(60), expiresAt);
        Assert.Equal("42", jwt.Claims.Single(c => c.Type == JwtClaimNames.Subject).Value);
        Assert.Equal(
            "recruit@example.com",
            jwt.Claims.Single(c => c.Type == JwtClaimNames.Email).Value
        );
        Assert.Equal("Manager", jwt.Claims.Single(c => c.Type == JwtClaimNames.Role).Value);
        Assert.Equal("onboarding-diary", jwt.Issuer);
    }
}
