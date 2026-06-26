using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Reports;
using OnboardingDiary.Application.Reports.Dtos;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Reports;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IReportDataCollector _dataCollector;
    private readonly IEnumerable<IReportRenderer> _renderers;
    private readonly IReportFileStore _fileStore;

    public ReportService(
        AppDbContext context,
        ICurrentUser currentUser,
        IReportDataCollector dataCollector,
        IEnumerable<IReportRenderer> renderers,
        IReportFileStore fileStore)
    {
        _context = context;
        _currentUser = currentUser;
        _dataCollector = dataCollector;
        _renderers = renderers;
        _fileStore = fileStore;
    }

    public async Task<GenerateReportResponse> GenerateAsync(GenerateReportRequest request, CancellationToken ct = default)
    {
        var currentUserId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var effectiveSubjectId = request.RecruitId ?? currentUserId;

        await EnforceGenerateAccess(currentUserId, effectiveSubjectId, role, ct);

        var expandedCategories = request.Categories
            .Any(c => c.Equals("all", StringComparison.OrdinalIgnoreCase))
            ? new List<string> { "tasks", "issues", "feedback", "notes" }
            : request.Categories.Select(c => c.ToLowerInvariant()).Distinct().ToList();

        var data = await _dataCollector.CollectAsync(
            effectiveSubjectId, currentUserId,
            request.StartDate, request.EndDate,
            expandedCategories, ct);

        var renderer = _renderers.FirstOrDefault(r => r.Format == request.Format)
            ?? throw new InvalidOperationException($"No renderer found for format {request.Format}.");

        var content = renderer.Render(data);
        var extension = request.Format == ReportFormat.Pdf ? "pdf" : "csv";

        var reportId = Guid.NewGuid();
        var fileUrl = await _fileStore.SaveAsync(reportId, extension, content, ct);

        var report = new Report
        {
            Id = reportId,
            GeneratedBy = currentUserId,
            RecruitId = effectiveSubjectId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Categories = expandedCategories,
            Format = request.Format,
            FileUrl = fileUrl
        };

        _context.Reports.Add(report);
        await _context.SaveChangesAsync(ct);

        var downloadUrl = $"/api/reports/{reportId}/download";
        return new GenerateReportResponse(reportId, downloadUrl);
    }

    public async Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(
        Guid reportId, ReportFormat? format, CancellationToken ct = default)
    {
        var currentUserId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var report = await _context.Reports.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == reportId, ct)
            ?? throw new KeyNotFoundException("Report not found.");

        await EnforceDownloadAccess(currentUserId, report, role, ct);

        if (report.FileUrl is null)
            throw new InvalidOperationException("Report file not available.");

        var stream = await _fileStore.LoadAsync(report.FileUrl, ct);

        var contentType = report.Format == ReportFormat.Pdf
            ? "application/pdf"
            : "text/csv";
        var fileName = $"report-{reportId}.{(report.Format == ReportFormat.Pdf ? "pdf" : "csv")}";

        return (stream, contentType, fileName);
    }

    public async Task<PagedResult<ReportListItemDto>> ListAsync(ReportListQuery query, CancellationToken ct = default)
    {
        var currentUserId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var q = _context.Reports.AsNoTracking().AsQueryable();

        if (role == nameof(Role.Admin))
        {
            // admins see all
        }
        else if (role == nameof(Role.Manager))
        {
            var assignedRecruitIds = await _context.Users.AsNoTracking()
                .Where(u => u.ManagerId == currentUserId)
                .Select(u => u.Id)
                .ToListAsync(ct);
            q = q.Where(r => r.GeneratedBy == currentUserId
                || r.RecruitId == currentUserId
                || assignedRecruitIds.Contains(r.RecruitId));
        }
        else
        {
            q = q.Where(r => r.RecruitId == currentUserId || r.GeneratedBy == currentUserId);
        }

        var total = await q.CountAsync(ct);

        var (page, limit) = PaginationParams.Normalize(query.Page, query.Limit);

        var reports = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        var recruitIds = reports.Select(r => r.RecruitId).Distinct().ToList();
        var recruitNames = await _context.Users.AsNoTracking()
            .Where(u => recruitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name, ct);

        var items = reports.Select(r => new ReportListItemDto(
            r.Id,
            r.GeneratedBy,
            r.RecruitId,
            recruitNames.GetValueOrDefault(r.RecruitId, "Unknown"),
            r.StartDate,
            r.EndDate,
            r.Categories,
            r.Format,
            r.FileUrl,
            r.CreatedAt
        )).ToList();

        return new PagedResult<ReportListItemDto>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit)
        };
    }

    private async Task EnforceGenerateAccess(Guid currentUserId, Guid subjectId, string? role, CancellationToken ct)
    {
        if (role == nameof(Role.Admin))
            return;

        if (subjectId == currentUserId)
            return;

        if (role == nameof(Role.Manager))
        {
            var recruit = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == subjectId, ct);
            if (recruit is not null && recruit.ManagerId == currentUserId)
                return;
        }

        throw new ForbiddenException("You do not have access to generate a report for this recruit.");
    }

    private async Task EnforceDownloadAccess(Guid currentUserId, Report report, string? role, CancellationToken ct)
    {
        if (role == nameof(Role.Admin))
            return;

        if (report.GeneratedBy == currentUserId)
            return;

        if (report.RecruitId == currentUserId)
            return;

        if (role == nameof(Role.Manager))
        {
            var recruit = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == report.RecruitId, ct);
            if (recruit is not null && recruit.ManagerId == currentUserId)
                return;
        }

        throw new ForbiddenException("You do not have access to this report.");
    }
}
