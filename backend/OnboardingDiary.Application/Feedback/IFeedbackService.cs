using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Feedback.Dtos;

namespace OnboardingDiary.Application.Feedback;

public interface IFeedbackService
{
    Task<PagedResult<FeedbackListItemDto>> ListAsync(FeedbackListQuery query, CancellationToken ct = default);
    Task<FeedbackDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<FeedbackDto> CreateAsync(CreateFeedbackRequest request, CancellationToken ct = default);
    Task<FeedbackDto?> UpdateAsync(Guid id, UpdateFeedbackRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
