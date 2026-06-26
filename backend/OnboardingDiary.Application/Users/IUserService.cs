using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Users;

public interface IUserService
{
    Task<UserDto> GetCurrentUserAsync();
    Task<UserDto> UpdateProfileAsync(UpdateProfileRequest request);
    Task<PagedResult<UserListItemDto>> ListUsersAsync(int page, int limit, string? search, Role? role, string? department);
    Task<UserDto> UpdateRoleAsync(Guid userId, Role role);
    Task DeactivateUserAsync(Guid userId);
}
