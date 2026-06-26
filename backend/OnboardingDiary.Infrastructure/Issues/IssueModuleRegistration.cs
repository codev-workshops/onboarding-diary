using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Issues;
using OnboardingDiary.Application.Issues.Mapping;

namespace OnboardingDiary.Infrastructure.Issues;

public static class IssueModuleRegistration
{
    public static IServiceCollection AddIssueModule(this IServiceCollection services)
    {
        services.AddScoped<IIssueRepository, IssueRepository>();
        services.AddScoped<IIssueService, IssueService>();
        IssueMappingConfig.Configure();
        return services;
    }
}
