using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Dashboard;

namespace OnboardingDiary.Infrastructure.Dashboard;

public static class DashboardModuleRegistration
{
    public static IServiceCollection AddDashboardModule(this IServiceCollection services)
    {
        services.AddScoped<IDashboardService, DashboardService>();
        return services;
    }
}
