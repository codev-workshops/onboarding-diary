using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Application.Tasks.Mapping;

namespace OnboardingDiary.Infrastructure.Tasks;

public static class TaskModuleRegistration
{
    public static IServiceCollection AddTaskModule(this IServiceCollection services)
    {
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<ITaskService, TaskService>();
        TaskMappingConfig.Configure();
        return services;
    }
}
