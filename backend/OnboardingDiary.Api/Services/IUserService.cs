using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetRecruitsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
}
