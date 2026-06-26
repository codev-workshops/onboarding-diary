using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Issues;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public interface IIssueService
{
    Task<PaginatedResponse<IssueResponseDto>> GetAllAsync(
        int currentUserId,
        UserRole currentUserRole,
        DateTime? dateFrom,
        DateTime? dateTo,
        IssueStatus? status,
        IssueSeverity? severity,
        int? userId,
        PaginationParams pagination);
    Task<IssueResponseDto> GetByIdAsync(int id, int currentUserId, UserRole currentUserRole);
    Task<IssueResponseDto> CreateAsync(CreateIssueDto dto, int currentUserId);
    Task<IssueResponseDto> UpdateAsync(int id, UpdateIssueDto dto, int currentUserId);
    Task DeleteAsync(int id, int currentUserId);
}
