using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Notes;
using OnboardingDiary.Application.Notes.Mapping;

namespace OnboardingDiary.Infrastructure.Notes;

public static class NoteModuleRegistration
{
    public static IServiceCollection AddNoteModule(this IServiceCollection services)
    {
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<INoteService, NoteService>();
        NoteMappingConfig.Configure();
        return services;
    }
}
