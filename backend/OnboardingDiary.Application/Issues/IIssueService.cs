using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Issues.Dtos;

namespace OnboardingDiary.Application.Issues;

public interface IIssueService
{
    Task<PagedResult<IssueDto>> ListAsync(IssueListQuery query, CancellationToken ct = default);
    Task<IssueDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IssueDto> CreateAsync(CreateIssueRequest request, CancellationToken ct = default);
    Task<IssueDto?> UpdateAsync(Guid id, UpdateIssueRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<IssueDto?> EscalateAsync(Guid id, EscalateIssueRequest request, CancellationToken ct = default);
}
