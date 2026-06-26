using OnboardingDiary.Api.DTOs.Users;

namespace OnboardingDiary.Api.Services;

public interface IUserService
{
    Task<UserProfileResponse> GetProfileAsync(int userId);
    Task<UserProfileResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
}
