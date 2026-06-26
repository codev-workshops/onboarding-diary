using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Issues;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Extensions;
using OnboardingDiary.Api.Repositories;

namespace OnboardingDiary.Api.Services;

public class IssueService : IIssueService
{
    private readonly IIssueRepository _issueRepository;
    private readonly IUserRepository _userRepository;

    public IssueService(IIssueRepository issueRepository, IUserRepository userRepository)
    {
        _issueRepository = issueRepository;
        _userRepository = userRepository;
    }

    public async Task<PaginatedResponse<IssueResponseDto>> GetAllAsync(
        int currentUserId,
        UserRole currentUserRole,
        DateTime? dateFrom,
        DateTime? dateTo,
        IssueStatus? status,
        IssueSeverity? severity,
        int? userId,
        PaginationParams pagination)
    {
        var query = _issueRepository.Query().Include(i => i.User).AsQueryable();

        query = ApplyRoleFilter(query, currentUserId, currentUserRole);
        query = _issueRepository.QueryByDateRange(query, dateFrom, dateTo);
        query = _issueRepository.QueryByStatus(query, status);
        query = _issueRepository.QueryBySeverity(query, severity);
        query = _issueRepository.QueryByUserId(query, userId);

        var sortBy = pagination.SortBy ?? "Date";
        query = query.OrderByProperty(sortBy, pagination.SortDescending);

        var paginatedResult = await query
            .Select(i => new IssueResponseDto
            {
                Id = i.Id,
                UserId = i.UserId,
                UserName = i.User.Name,
                Date = i.Date,
                Title = i.Title,
                Description = i.Description,
                Severity = i.Severity.ToString(),
                Status = i.Status.ToString(),
                ResolutionNotes = i.ResolutionNotes,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt
            })
            .ToPaginatedResponseAsync(pagination);

        return paginatedResult;
    }

    public async Task<IssueResponseDto> GetByIdAsync(int id, int currentUserId, UserRole currentUserRole)
    {
        var issue = await _issueRepository.Query()
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Issue not found.");

        EnsureCanView(issue, currentUserId, currentUserRole);

        return MapToDto(issue);
    }

    public async Task<IssueResponseDto> CreateAsync(CreateIssueDto dto, int currentUserId)
    {
        ValidateDate(dto.Date);
        ValidateResolutionNotes(dto.Status, dto.ResolutionNotes);

        var issue = new IssueEntry
        {
            UserId = currentUserId,
            Date = dto.Date,
            Title = dto.Title,
            Description = dto.Description,
            Severity = dto.Severity,
            Status = dto.Status,
            ResolutionNotes = dto.ResolutionNotes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _issueRepository.AddAsync(issue);

        var created = await _issueRepository.Query()
            .Include(i => i.User)
            .FirstAsync(i => i.Id == issue.Id);

        return MapToDto(created);
    }

    public async Task<IssueResponseDto> UpdateAsync(int id, UpdateIssueDto dto, int currentUserId)
    {
        var issue = await _issueRepository.Query()
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new KeyNotFoundException("Issue not found.");

        if (issue.UserId != currentUserId)
            throw new UnauthorizedAccessException("You can only update your own issues.");

        if (dto.Date.HasValue)
        {
            ValidateDate(dto.Date.Value);
            issue.Date = dto.Date.Value;
        }

        if (dto.Title != null)
            issue.Title = dto.Title;

        if (dto.Description != null)
            issue.Description = dto.Description;

        if (dto.Severity.HasValue)
            issue.Severity = dto.Severity.Value;

        if (dto.Status.HasValue)
            issue.Status = dto.Status.Value;

        if (dto.ResolutionNotes != null)
            issue.ResolutionNotes = dto.ResolutionNotes;

        var effectiveStatus = dto.Status ?? issue.Status;
        var effectiveResolutionNotes = dto.ResolutionNotes ?? issue.ResolutionNotes;
        ValidateResolutionNotes(effectiveStatus, effectiveResolutionNotes);

        issue.UpdatedAt = DateTime.UtcNow;

        await _issueRepository.UpdateAsync(issue);

        return MapToDto(issue);
    }

    public async Task DeleteAsync(int id, int currentUserId)
    {
        var issue = await _issueRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Issue not found.");

        if (issue.UserId != currentUserId)
            throw new UnauthorizedAccessException("You can only delete your own issues.");

        await _issueRepository.DeleteAsync(issue);
    }

    private static IQueryable<IssueEntry> ApplyRoleFilter(
        IQueryable<IssueEntry> query, int currentUserId, UserRole role)
    {
        return role switch
        {
            UserRole.Admin => query,
            UserRole.Manager => query.Where(i =>
                i.UserId == currentUserId || i.User.ManagerId == currentUserId),
            _ => query.Where(i => i.UserId == currentUserId)
        };
    }

    private static void EnsureCanView(IssueEntry issue, int currentUserId, UserRole role)
    {
        if (role == UserRole.Admin) return;
        if (issue.UserId == currentUserId) return;
        if (role == UserRole.Manager && issue.User.ManagerId == currentUserId) return;
        throw new UnauthorizedAccessException("You do not have access to this issue.");
    }

    private static void ValidateDate(DateTime date)
    {
        if (date.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("Date cannot be in the future.");
    }

    private static void ValidateResolutionNotes(IssueStatus status, string? resolutionNotes)
    {
        if (status is IssueStatus.Resolved or IssueStatus.Closed)
        {
            if (string.IsNullOrWhiteSpace(resolutionNotes))
                throw new ArgumentException("Resolution notes are required when status is Resolved or Closed.");

            if (resolutionNotes.Trim().Length < 10)
                throw new ArgumentException("Resolution notes must be at least 10 characters.");

            if (resolutionNotes.Trim().Length > 5000)
                throw new ArgumentException("Resolution notes must not exceed 5000 characters.");
        }
    }

    private static IssueResponseDto MapToDto(IssueEntry issue)
    {
        return new IssueResponseDto
        {
            Id = issue.Id,
            UserId = issue.UserId,
            UserName = issue.User.Name,
            Date = issue.Date,
            Title = issue.Title,
            Description = issue.Description,
            Severity = issue.Severity.ToString(),
            Status = issue.Status.ToString(),
            ResolutionNotes = issue.ResolutionNotes,
            CreatedAt = issue.CreatedAt,
            UpdatedAt = issue.UpdatedAt
        };
    }
}
