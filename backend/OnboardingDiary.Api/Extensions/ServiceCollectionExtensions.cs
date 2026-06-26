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
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IIssueRepository, IssueRepository>();
        services.AddScoped<IFeedbackRepository, FeedbackRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<IIssueService, IssueService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReportService, ReportService>();

        services.AddSingleton<JwtTokenGenerator>();

        return services;
    }
}
