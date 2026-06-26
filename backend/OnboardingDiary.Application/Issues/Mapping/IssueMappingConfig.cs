using Mapster;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Issues.Mapping;

public static class IssueMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<Issue, IssueDto>.NewConfig()
            .Map(dest => dest.Severity, src => src.Severity.ToString())
            .Map(dest => dest.Status, src => src.Status.ToString());
    }
}
