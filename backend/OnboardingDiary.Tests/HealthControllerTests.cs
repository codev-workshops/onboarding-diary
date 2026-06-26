using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
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
                services.RemoveAll<DbContextOptions<Infrastructure.Persistence.AppDbContext>>();
                services.RemoveAll<Infrastructure.Persistence.AppDbContext>();

                var efDescriptors = services
                    .Where(d => d.ServiceType.FullName != null
                             && (d.ServiceType.FullName.Contains("EntityFramework")
                              || d.ServiceType.FullName.Contains("SqlServer")))
                    .ToList();

                foreach (var descriptor in efDescriptors)
                    services.Remove(descriptor);

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
