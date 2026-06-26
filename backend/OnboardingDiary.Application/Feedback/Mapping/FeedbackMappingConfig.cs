using Mapster;
using OnboardingDiary.Application.Feedback.Dtos;

namespace OnboardingDiary.Application.Feedback.Mapping;

public static class FeedbackMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<Domain.Entities.Feedback, FeedbackDto>.NewConfig()
            .Map(dest => dest.Type, src => src.Type.ToString());

        TypeAdapterConfig<Domain.Entities.Feedback, FeedbackListItemDto>.NewConfig()
            .Map(dest => dest.Type, src => src.Type.ToString())
            .Map(dest => dest.AuthorName, src => src.User != null ? src.User.Name : null)
            .Map(dest => dest.AuthorDepartment, src => src.User != null ? src.User.Department : null);
    }
}
