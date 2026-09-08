using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using OnboardingDiary.Api.Infrastructure.Seed;

namespace OnboardingDiary.UnitTests;

public class E2eSeederTests
{
    private sealed class Environment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "OnboardingDiary.Api";

        public string ContentRootPath { get; set; } = ".";

        public IFileProvider ContentRootFileProvider { get; set; } =
            new NullFileProvider();
    }

    private static IConfiguration Configuration(string? value) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(
                value is null ? [] : new Dictionary<string, string?> { [E2eSeeder.EnabledKey] = value }
            )
            .Build();

    [Theory]
    [InlineData("Development", "true", true)]
    [InlineData("Development", "false", false)]
    [InlineData("Development", null, false)]
    [InlineData("Production", "true", false)]
    [InlineData("Staging", "true", false)]
    public void Seeding_is_opt_in_and_development_only(
        string environmentName,
        string? enabled,
        bool expected
    )
    {
        Assert.Equal(
            expected,
            E2eSeeder.IsEnabled(new Environment(environmentName), Configuration(enabled))
        );
    }
}
