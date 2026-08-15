using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Tests.Integration;

public class AuthEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Signup_CreatesANewRecruitAndReturnsAToken()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/signup", new SignupRequest
        {
            Email = $"signup-{Guid.NewGuid():N}@onboarding.local",
            Password = "Recruit#12345",
            FullName = "Sam Starter"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(ApiFactory.JsonOptions);
        auth!.Token.Should().NotBeNullOrWhiteSpace();
        auth.User.Role.Should().Be(UserRole.NewRecruit);
    }

    [Fact]
    public async Task Signup_ReturnsTheStandardErrorEnvelopeForInvalidInput()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/signup", new SignupRequest
        {
            Email = "nope",
            Password = "x",
            FullName = string.Empty
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(ApiFactory.JsonOptions);
        error!.Error.Code.Should().Be("validation_error");
        error.Error.Details.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Login_RejectsAWrongPassword()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "admin@onboarding.local",
            Password = "definitely-wrong"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_SucceedsForTheSeededAdmin()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "admin@onboarding.local",
            Password = "Admin#12345"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(ApiFactory.JsonOptions);
        auth!.User.Role.Should().Be(UserRole.Admin);
    }

    [Fact]
    public async Task ProtectedEndpoints_RejectAnonymousCallers()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/tasks", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
