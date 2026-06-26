using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Feedback;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Extensions;
using OnboardingDiary.Api.Repositories;

namespace OnboardingDiary.Api.Services;

public class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _feedbackRepository;

    public FeedbackService(IFeedbackRepository feedbackRepository)
    {
        _feedbackRepository = feedbackRepository;
    }

    public async Task<PaginatedResponse<FeedbackResponseDto>> GetAllAsync(
        int userId,
        string userRole,
        DateTime? dateFrom,
        DateTime? dateTo,
        FeedbackType? type,
        int? filterUserId,
        PaginationParams pagination)
    {
        IQueryable<FeedbackEntry> query;

        if (userRole == "Admin")
        {
            query = filterUserId.HasValue
                ? _feedbackRepository.GetByUserId(filterUserId.Value)
                : _feedbackRepository.Query();
        }
        else if (userRole == "Manager")
        {
            if (filterUserId.HasValue)
            {
                if (filterUserId.Value == userId ||
                    await _feedbackRepository.IsUserManagedByAsync(filterUserId.Value, userId))
                {
                    query = _feedbackRepository.GetByUserId(filterUserId.Value);
                }
                else
                {
                    throw new UnauthorizedAccessException("You can only view feedback for your assigned recruits.");
                }
            }
            else
            {
                var managedQuery = _feedbackRepository.GetByManagerId(userId);
                var ownQuery = _feedbackRepository.GetByUserId(userId);
                query = managedQuery.Union(ownQuery);
            }
        }
        else
        {
            query = _feedbackRepository.GetByUserId(userId);
        }

        query = _feedbackRepository.GetByDateRange(query, dateFrom, dateTo);
        query = _feedbackRepository.GetByType(query, type);

        var sortBy = string.IsNullOrWhiteSpace(pagination.SortBy) ? "Date" : pagination.SortBy;
        query = query.OrderByProperty(sortBy, pagination.SortDescending);

        var paginatedResult = await query
            .Select(f => new FeedbackResponseDto
            {
                Id = f.Id,
                UserId = f.UserId,
                Date = f.Date,
                Subject = f.Subject,
                Type = f.Type,
                Details = f.Details,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt
            })
            .ToPaginatedResponseAsync(pagination);

        return paginatedResult;
    }

    public async Task<FeedbackResponseDto> GetByIdAsync(int id, int userId, string userRole)
    {
        var entry = await _feedbackRepository.GetByIdAsync(id);

        if (entry == null)
            throw new KeyNotFoundException("Feedback entry not found.");

        if (entry.UserId == userId)
            return MapToDto(entry);

        if (userRole == "Admin")
            return MapToDto(entry);

        if (userRole == "Manager")
        {
            var isManaged = await _feedbackRepository.IsUserManagedByAsync(entry.UserId, userId);
            if (isManaged)
                return MapToDto(entry);
        }

        throw new UnauthorizedAccessException("You do not have access to this feedback entry.");
    }

    public async Task<FeedbackResponseDto> CreateAsync(CreateFeedbackDto dto, int userId)
    {
        if (dto.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("Date cannot be in the future.");

        var entry = new FeedbackEntry
        {
            UserId = userId,
            Date = dto.Date,
            Subject = dto.Subject,
            Type = dto.Type,
            Details = dto.Details,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _feedbackRepository.AddAsync(entry);
        return MapToDto(created);
    }

    public async Task<FeedbackResponseDto> UpdateAsync(int id, UpdateFeedbackDto dto, int userId)
    {
        var entry = await _feedbackRepository.GetByIdAsync(id);

        if (entry == null)
            throw new KeyNotFoundException("Feedback entry not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("You can only update your own feedback entries.");

        if (dto.Date.HasValue)
        {
            if (dto.Date.Value > DateTime.UtcNow.Date)
                throw new ArgumentException("Date cannot be in the future.");
            entry.Date = dto.Date.Value;
        }

        if (dto.Subject != null)
            entry.Subject = dto.Subject;

        if (dto.Type.HasValue)
            entry.Type = dto.Type.Value;

        if (dto.Details != null)
            entry.Details = dto.Details;

        entry.UpdatedAt = DateTime.UtcNow;
        await _feedbackRepository.UpdateAsync(entry);

        return MapToDto(entry);
    }

    public async Task DeleteAsync(int id, int userId)
    {
        var entry = await _feedbackRepository.GetByIdAsync(id);

        if (entry == null)
            throw new KeyNotFoundException("Feedback entry not found.");

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own feedback entries.");

        await _feedbackRepository.DeleteAsync(entry);
    }

    private static FeedbackResponseDto MapToDto(FeedbackEntry entry)
    {
        return new FeedbackResponseDto
        {
            Id = entry.Id,
            UserId = entry.UserId,
            Date = entry.Date,
            Subject = entry.Subject,
            Type = entry.Type,
            Details = entry.Details,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }
}
