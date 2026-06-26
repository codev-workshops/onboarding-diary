using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Auth.Mapping;
using OnboardingDiary.Application.Common.Auth;
using OnboardingDiary.Application.Users;
using OnboardingDiary.Application.Users.Mapping;
using OnboardingDiary.Infrastructure.Auth;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Infrastructure.Feedback;
using OnboardingDiary.Infrastructure.Issues;
using OnboardingDiary.Infrastructure.Notes;
using OnboardingDiary.Infrastructure.Reports;
using OnboardingDiary.Infrastructure.Tasks;
using OnboardingDiary.Application.Common.Security;
using OnboardingDiary.Infrastructure.Users;

namespace OnboardingDiary.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        var databaseProvider = configuration.GetValue<string>("DatabaseProvider") ?? "SqlServer";
        services.AddDbContext<AppDbContext>(options =>
        {
            switch (databaseProvider.ToLowerInvariant())
            {
                case "inmemory":
                    options.UseInMemoryDatabase("OnboardingDiaryE2E");
                    break;
                case "sqlite":
                    options.UseSqlite(connectionString);
                    break;
                default:
                    options.UseSqlServer(connectionString);
                    break;
            }
        });

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<SecurityOptions>(configuration.GetSection(SecurityOptions.SectionName));

        services.AddHttpContextAccessor();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IEmailSender, LoggingEmailSender>();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddSingleton<ISanitizer, HtmlSanitizer>();

        services.AddValidatorsFromAssemblyContaining<Application.Auth.Validators.RegisterRequestValidator>();

        AuthMappingConfig.Configure();

        services.AddUserModule();
        services.AddTaskModule();
        services.AddNoteModule();
        services.AddIssueModule();
        services.AddFeedbackModule();
        services.AddReportModule();

        return services;
    }

    private static IServiceCollection AddUserModule(this IServiceCollection services)
    {
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAuditLogger, AuditLogger>();

        UserMappingConfig.Configure();

        return services;
    }
}
