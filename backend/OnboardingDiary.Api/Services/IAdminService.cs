using OnboardingDiary.Api.DTOs.Admin;
using OnboardingDiary.Api.DTOs.Common;

namespace OnboardingDiary.Api.Services;

public interface IAdminService
{
    // User management
    Task<PaginatedResponse<UserResponseDto>> GetUsersAsync(UserFilterParams filterParams);
    Task<UserResponseDto> GetUserByIdAsync(int id);
    Task<UserResponseDto> CreateUserAsync(CreateUserDto dto);
    Task<UserResponseDto> UpdateUserAsync(int id, UpdateUserDto dto);
    Task<UserResponseDto> UpdateUserStatusAsync(int id, UserStatusDto dto);
    Task<UserResponseDto> AssignManagerAsync(int userId, AssignManagerDto dto);

    // Department management
    Task<IEnumerable<DepartmentDto>> GetDepartmentsAsync();
    Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto dto);
    Task<DepartmentDto> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto);
    Task DeleteDepartmentAsync(int id);

    // Category management
    Task<IEnumerable<CategoryDto>> GetCategoriesAsync();
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto);
    Task<CategoryDto> UpdateCategoryAsync(int id, UpdateCategoryDto dto);
    Task DeleteCategoryAsync(int id);
}
