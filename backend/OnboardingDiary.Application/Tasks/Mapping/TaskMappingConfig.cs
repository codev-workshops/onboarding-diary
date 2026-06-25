using Mapster;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Tasks.Mapping;

public static class TaskMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<TaskEntity, TaskDto>.NewConfig()
            .Map(dest => dest.Category, src => src.Category.ToString())
            .Map(dest => dest.Status, src => src.Status.ToString())
            .Map(dest => dest.Priority, src => src.Priority.ToString());
    }
}
