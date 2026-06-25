using Mapster;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Auth.Mapping;

public static class AuthMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<User, UserDto>.NewConfig()
            .Map(dest => dest.Role, src => src.Role.ToString());
    }
}
