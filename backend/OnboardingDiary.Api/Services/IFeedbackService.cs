using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IFeedbackService
{
    Task<PagedResult<FeedbackDto>> GetAsync(FeedbackQuery query, CancellationToken cancellationToken = default);

    Task<FeedbackDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<FeedbackDto> CreateAsync(SaveFeedbackRequest request, CancellationToken cancellationToken = default);

    Task<FeedbackDto> UpdateAsync(int id, SaveFeedbackRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
