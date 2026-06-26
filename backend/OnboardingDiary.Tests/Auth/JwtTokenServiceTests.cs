using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using OnboardingDiary.Application.Common.Auth;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Auth;

namespace OnboardingDiary.Tests.Auth;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _service;
    private readonly JwtOptions _options;

    public JwtTokenServiceTests()
    {
        _options = new JwtOptions
        {
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            SigningKey = "TestSigningKeyThatIsAtLeast32BytesLong!!",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        };
        _service = new JwtTokenService(Options.Create(_options));
    }

    [Fact]
    public void CreateAccessToken_ContainsExpectedClaims()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            Name = "Test User",
            Role = Role.Recruit,
            Department = "Engineering",
            StartDate = DateTime.UtcNow,
            PasswordHash = "hash"
        };

        var token = _service.CreateAccessToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Equal(user.Email, jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == "Recruit");
        Assert.NotNull(jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti));
        Assert.True(jwt.ValidTo > DateTime.UtcNow);
    }

    [Fact]
    public void CreateAccessToken_HasCorrectIssuerAndAudience()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "a@b.com",
            Role = Role.Admin,
            Department = "HR",
            StartDate = DateTime.UtcNow,
            PasswordHash = "hash",
            Name = "Admin"
        };

        var token = _service.CreateAccessToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(_options.Issuer, jwt.Issuer);
        Assert.Contains(_options.Audience, jwt.Audiences);
    }

    [Fact]
    public void CreateRefreshToken_ReturnsUniqueTokensAndEntity()
    {
        var userId = Guid.NewGuid();

        var (raw1, entity1) = _service.CreateRefreshToken(userId);
        var (raw2, entity2) = _service.CreateRefreshToken(userId);

        Assert.False(string.IsNullOrEmpty(raw1));
        Assert.NotEqual(raw1, raw2);
        Assert.Equal(userId, entity1.UserId);
        Assert.Equal(raw1, entity1.Token);
        Assert.True(entity1.ExpiresAt > DateTime.UtcNow.AddDays(6));
    }
}
