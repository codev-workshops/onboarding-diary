using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Feedback;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public interface IFeedbackService
{
    Task<PaginatedResponse<FeedbackResponseDto>> GetAllAsync(
        int userId,
        string userRole,
        DateTime? dateFrom,
        DateTime? dateTo,
        FeedbackType? type,
        int? filterUserId,
        PaginationParams pagination);

    Task<FeedbackResponseDto> GetByIdAsync(int id, int userId, string userRole);
    Task<FeedbackResponseDto> CreateAsync(CreateFeedbackDto dto, int userId);
    Task<FeedbackResponseDto> UpdateAsync(int id, UpdateFeedbackDto dto, int userId);
    Task DeleteAsync(int id, int userId);
}
