using Mapster;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Issues;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Issues;

public class IssueService : IIssueService
{
    private readonly IIssueRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _context;
    private readonly IEmailSender _emailSender;

    public IssueService(IIssueRepository repository, ICurrentUser currentUser, AppDbContext context, IEmailSender emailSender)
    {
        _repository = repository;
        _currentUser = currentUser;
        _context = context;
        _emailSender = emailSender;
    }

    public async Task<IssueDto> CreateAsync(CreateIssueRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = new Issue
        {
            UserId = userId,
            Date = request.Date,
            Title = request.Title.Trim(),
            Description = request.Description,
            Severity = request.Severity,
            Status = request.Status,
            ResolutionNotes = request.ResolutionNotes,
        };

        if (request.Status == IssueStatus.Resolved || request.Status == IssueStatus.Closed)
            entity.ResolvedAt = DateTime.UtcNow;

        _repository.Add(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<IssueDto>();
    }

    public async Task<PagedResult<IssueDto>> ListAsync(IssueListQuery query, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var q = _repository.Query();

        if (role == nameof(Role.Admin))
        {
            if (query.RecruitId.HasValue)
                q = q.Where(i => i.UserId == query.RecruitId.Value);
        }
        else if (role == nameof(Role.Manager))
        {
            if (query.RecruitId.HasValue)
            {
                var recruit = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == query.RecruitId.Value, ct);
                if (recruit is null || recruit.ManagerId != userId)
                    throw new ForbiddenException("You do not have access to this recruit's issues.");
                q = q.Where(i => i.UserId == query.RecruitId.Value);
            }
            else
            {
                q = q.Where(i => i.UserId == userId);
            }
        }
        else
        {
            q = q.Where(i => i.UserId == userId);
        }

        if (query.Status.HasValue)
            q = q.Where(i => i.Status == query.Status.Value);
        if (query.Severity.HasValue)
            q = q.Where(i => i.Severity == query.Severity.Value);
        if (query.StartDate.HasValue)
            q = q.Where(i => i.Date >= query.StartDate.Value);
        if (query.EndDate.HasValue)
            q = q.Where(i => i.Date <= query.EndDate.Value);

        var total = await q.CountAsync(ct);

        var (page, limit) = PaginationParams.Normalize(query.Page, query.Limit);

        var items = await q
            .OrderByDescending(i => i.Date)
            .ThenByDescending(i => i.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        return new PagedResult<IssueDto>
        {
            Items = items.Adapt<List<IssueDto>>(),
            Total = total,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit)
        };
    }

    public async Task<IssueDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var entity = await _repository.Query().FirstOrDefaultAsync(i => i.Id == id, ct);
        if (entity is null) return null;

        if (role == nameof(Role.Admin))
            return entity.Adapt<IssueDto>();

        if (entity.UserId == userId)
            return entity.Adapt<IssueDto>();

        if (role == nameof(Role.Manager))
        {
            var recruit = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == entity.UserId, ct);
            if (recruit is not null && recruit.ManagerId == userId)
                return entity.Adapt<IssueDto>();
        }

        return null;
    }

    private static readonly HashSet<(IssueStatus From, IssueStatus To)> InvalidTransitions = new()
    {
        (IssueStatus.Closed, IssueStatus.Open),
    };

    public async Task<IssueDto?> UpdateAsync(Guid id, UpdateIssueRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        var previousStatus = entity.Status;

        if (InvalidTransitions.Contains((previousStatus, request.Status)))
            throw new BusinessRuleException($"Cannot transition from {previousStatus} to {request.Status}.");

        entity.Title = request.Title.Trim();
        entity.Description = request.Description;
        entity.Severity = request.Severity;
        entity.Status = request.Status;
        entity.ResolutionNotes = request.ResolutionNotes;

        if ((request.Status == IssueStatus.Resolved || request.Status == IssueStatus.Closed)
            && previousStatus != IssueStatus.Resolved && previousStatus != IssueStatus.Closed)
        {
            entity.ResolvedAt = DateTime.UtcNow;
        }
        else if (request.Status != IssueStatus.Resolved && request.Status != IssueStatus.Closed)
        {
            entity.ResolvedAt = null;
        }

        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<IssueDto>();
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

    public async Task<IssueDto?> EscalateAsync(Guid id, EscalateIssueRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        entity.IsEscalated = true;
        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user?.ManagerId != null)
        {
            var manager = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == user.ManagerId, ct);
            if (manager is not null)
            {
                await _emailSender.SendAsync(
                    manager.Email,
                    $"Issue Escalated: {entity.Title}",
                    $"Issue escalated by {user.Name}.\n\n{request.Message}");
            }
        }

        return entity.Adapt<IssueDto>();
    }
}
