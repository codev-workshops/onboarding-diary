using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Repositories;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IIssueRepository, IssueRepository>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IIssueService, IssueService>();

        services.AddSingleton<JwtTokenGenerator>();

        return services;
    }
}
