using Mapster;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Feedback;
using OnboardingDiary.Application.Feedback.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Feedback;

public class FeedbackService : IFeedbackService
{
    private readonly IFeedbackRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _context;

    public FeedbackService(IFeedbackRepository repository, ICurrentUser currentUser, AppDbContext context)
    {
        _repository = repository;
        _currentUser = currentUser;
        _context = context;
    }

    public async Task<FeedbackDto> CreateAsync(CreateFeedbackRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = new Domain.Entities.Feedback
        {
            UserId = userId,
            Date = request.Date,
            Subject = request.Subject.Trim(),
            Type = request.Type,
            Details = request.Details,
        };

        _repository.Add(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<FeedbackDto>();
    }

    public async Task<PagedResult<FeedbackListItemDto>> ListAsync(FeedbackListQuery query, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        IQueryable<Domain.Entities.Feedback> q = _context.Feedbacks.AsNoTracking();

        if (role == nameof(Role.Admin))
        {
            if (query.RecruitId.HasValue)
                q = q.Where(f => f.UserId == query.RecruitId.Value);

            if (!string.IsNullOrWhiteSpace(query.Department))
                q = q.Where(f => f.User.Department == query.Department);
        }
        else if (role == nameof(Role.Manager))
        {
            if (query.RecruitId.HasValue)
            {
                var recruit = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == query.RecruitId.Value, ct);
                if (recruit is null || recruit.ManagerId != userId)
                    throw new ForbiddenException("You do not have access to this recruit's feedback.");
                q = q.Where(f => f.UserId == query.RecruitId.Value);
            }
            else
            {
                q = q.Where(f => f.UserId == userId);
            }
        }
        else
        {
            q = q.Where(f => f.UserId == userId);
        }

        if (query.Type.HasValue)
            q = q.Where(f => f.Type == query.Type.Value);
        if (query.StartDate.HasValue)
            q = q.Where(f => f.Date >= query.StartDate.Value);
        if (query.EndDate.HasValue)
            q = q.Where(f => f.Date <= query.EndDate.Value);

        var total = await q.CountAsync(ct);

        var (page, limit) = PaginationParams.Normalize(query.Page, query.Limit);

        var items = await q
            .Include(f => f.User)
            .OrderByDescending(f => f.Date)
            .ThenByDescending(f => f.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        return new PagedResult<FeedbackListItemDto>
        {
            Items = items.Adapt<List<FeedbackListItemDto>>(),
            Total = total,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit)
        };
    }

    public async Task<FeedbackDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var entity = await _repository.Query().FirstOrDefaultAsync(f => f.Id == id, ct);
        if (entity is null) return null;

        if (role == nameof(Role.Admin))
            return entity.Adapt<FeedbackDto>();

        if (entity.UserId == userId)
            return entity.Adapt<FeedbackDto>();

        if (role == nameof(Role.Manager))
        {
            var recruit = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == entity.UserId, ct);
            if (recruit is not null && recruit.ManagerId == userId)
                return entity.Adapt<FeedbackDto>();
        }

        return null;
    }

    public async Task<FeedbackDto?> UpdateAsync(Guid id, UpdateFeedbackRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        entity.Subject = request.Subject.Trim();
        entity.Type = request.Type;
        entity.Details = request.Details;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<FeedbackDto>();
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null) return false;

        if (entity.UserId != userId && role != nameof(Role.Admin))
            return false;

        entity.IsDeleted = true;
        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return true;
    }
}
