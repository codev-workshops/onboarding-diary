using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IIssueService
{
    Task<PagedResult<IssueDto>> GetAsync(IssueQuery query, CancellationToken cancellationToken = default);

    Task<IssueDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<IssueDto> CreateAsync(SaveIssueRequest request, CancellationToken cancellationToken = default);

    Task<IssueDto> UpdateAsync(int id, SaveIssueRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
