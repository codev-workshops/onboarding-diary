using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;

namespace OnboardingDiary.Tests;

public class HealthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove the real DbContext registration for testing
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(Microsoft.EntityFrameworkCore.DbContextOptions<Infrastructure.Persistence.AppDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                var dbContextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(Infrastructure.Persistence.AppDbContext));
                if (dbContextDescriptor != null)
                    services.Remove(dbContextDescriptor);

                // Add an in-memory database for testing
                services.AddDbContext<Infrastructure.Persistence.AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOkWithExpectedPayload()
    {
        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<HealthResponse>();
        content.Should().NotBeNull();
        content!.Status.Should().Be("ok");
    }

    private record HealthResponse(string Status);
}
