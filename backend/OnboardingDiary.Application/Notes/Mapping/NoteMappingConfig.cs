using Mapster;
using OnboardingDiary.Application.Notes.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Notes.Mapping;

public static class NoteMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<Note, NoteDto>.NewConfig();
    }
}
