using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Feedback;
using OnboardingDiary.Application.Feedback.Mapping;

namespace OnboardingDiary.Infrastructure.Feedback;

public static class FeedbackModuleRegistration
{
    public static IServiceCollection AddFeedbackModule(this IServiceCollection services)
    {
        services.AddScoped<IFeedbackRepository, FeedbackRepository>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        FeedbackMappingConfig.Configure();
        return services;
    }
}
