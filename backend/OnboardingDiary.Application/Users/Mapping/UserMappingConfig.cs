using Mapster;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Users.Mapping;

public static class UserMappingConfig
{
    public static void Configure()
    {
        TypeAdapterConfig<User, UserListItemDto>.NewConfig()
            .Map(dest => dest.Role, src => src.Role.ToString());
    }
}
