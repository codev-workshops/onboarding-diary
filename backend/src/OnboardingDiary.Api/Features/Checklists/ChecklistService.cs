using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Checklists;

public enum ChecklistApplyOutcome
{
    Applied,
    TemplateNotFound,
    AlreadyApplied,
}

public enum ChecklistSaveOutcome
{
    Saved,
    NotFound,
    NameTaken,
    DepartmentNotFound,
}

public enum ChecklistDeleteOutcome
{
    Deleted,
    NotFound,
    HasAssignments,
}

public class ChecklistService(AppDbContext db, TimeProvider timeProvider)
{
    public async Task<PagedResponse<ChecklistTemplateResponse>> ListTemplatesAsync(
        ChecklistTemplateListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var templates = db.ChecklistTemplates.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            templates = templates.Where(t => EF.Functions.Like(t.Name, $"%{term}%"));
        }

        if (query.DepartmentId is { } departmentId)
        {
            templates = templates.Where(t => t.DepartmentId == departmentId);
        }

        if (query.IsActive is { } isActive)
        {
            templates = templates.Where(t => t.IsActive == isActive);
        }

        templates = query.Sort switch
        {
            "-name" => templates.OrderByDescending(t => t.Name).ThenBy(t => t.Id),
            // SQLite cannot order by DateTimeOffset; the identity column is creation order.
            "created_at" => templates.OrderBy(t => t.Id),
            "-created_at" => templates.OrderByDescending(t => t.Id),
            _ => templates.OrderBy(t => t.Name).ThenBy(t => t.Id),
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await templates.CountAsync(cancellationToken);
        var items = await templates
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new ChecklistTemplateResponse(
                t.Id,
                t.Name,
                t.Description,
                t.DepartmentId,
                t.Department == null ? null : t.Department.Name,
                t.IsActive,
                t.Items.Count,
                db.ChecklistAssignments.Count(a => a.TemplateId == t.Id),
                t.CreatedAt,
                t.UpdatedAt,
                t.Items.OrderBy(i => i.Position)
                    .Select(i => new ChecklistItemResponse(
                        i.Id,
                        i.Position,
                        i.Title,
                        i.Description,
                        i.Category,
                        i.DueOffsetDays
                    ))
                    .ToList()
            ))
            .ToListAsync(cancellationToken);

        return new PagedResponse<ChecklistTemplateResponse>(items, page, pageSize, total);
    }

    public async Task<ChecklistTemplateResponse?> GetTemplateAsync(
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var template = await db
            .ChecklistTemplates.AsNoTracking()
            .Include(t => t.Department)
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (template is null)
        {
            return null;
        }

        var assignmentCount = await db.ChecklistAssignments.CountAsync(
            a => a.TemplateId == id,
            cancellationToken
        );

        return Describe(template, assignmentCount);
    }

    public async Task<(
        ChecklistSaveOutcome Outcome,
        ChecklistTemplateResponse? Template
    )> CreateTemplateAsync(
        SaveChecklistTemplateRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var name = request.Name.Trim();
        if (await db.ChecklistTemplates.AnyAsync(t => t.Name == name, cancellationToken))
        {
            return (ChecklistSaveOutcome.NameTaken, null);
        }

        if (!await DepartmentExistsAsync(request.DepartmentId, cancellationToken))
        {
            return (ChecklistSaveOutcome.DepartmentNotFound, null);
        }

        var now = timeProvider.GetUtcNow();
        var template = new ChecklistTemplate
        {
            Name = name,
            Description = request.Description?.Trim(),
            DepartmentId = request.DepartmentId,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now,
            Items = BuildItems(request.Items),
        };

        db.ChecklistTemplates.Add(template);
        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(template).Reference(t => t.Department).LoadAsync(cancellationToken);

        return (ChecklistSaveOutcome.Saved, Describe(template, 0));
    }

    /// <summary>
    /// Replaces the template and its whole ordered item list. Already-generated tasks are never
    /// touched: an edit reaches future applications only.
    /// </summary>
    public async Task<(
        ChecklistSaveOutcome Outcome,
        ChecklistTemplateResponse? Template
    )> UpdateTemplateAsync(
        int id,
        SaveChecklistTemplateRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var template = await db
            .ChecklistTemplates.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (template is null)
        {
            return (ChecklistSaveOutcome.NotFound, null);
        }

        var name = request.Name.Trim();
        if (await db.ChecklistTemplates.AnyAsync(t => t.Name == name && t.Id != id, cancellationToken))
        {
            return (ChecklistSaveOutcome.NameTaken, null);
        }

        if (!await DepartmentExistsAsync(request.DepartmentId, cancellationToken))
        {
            return (ChecklistSaveOutcome.DepartmentNotFound, null);
        }

        template.Name = name;
        template.Description = request.Description?.Trim();
        template.DepartmentId = request.DepartmentId;
        template.IsActive = request.IsActive;
        template.UpdatedAt = timeProvider.GetUtcNow();

        db.ChecklistItems.RemoveRange(template.Items);
        template.Items = BuildItems(request.Items);

        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(template).Reference(t => t.Department).LoadAsync(cancellationToken);

        var assignmentCount = await db.ChecklistAssignments.CountAsync(
            a => a.TemplateId == id,
            cancellationToken
        );

        return (ChecklistSaveOutcome.Saved, Describe(template, assignmentCount));
    }

    public async Task<ChecklistDeleteOutcome> DeleteTemplateAsync(
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var template = await db.ChecklistTemplates.FirstOrDefaultAsync(
            t => t.Id == id,
            cancellationToken
        );

        if (template is null)
        {
            return ChecklistDeleteOutcome.NotFound;
        }

        if (await db.ChecklistAssignments.AnyAsync(a => a.TemplateId == id, cancellationToken))
        {
            return ChecklistDeleteOutcome.HasAssignments;
        }

        db.ChecklistTemplates.Remove(template);
        await db.SaveChangesAsync(cancellationToken);

        return ChecklistDeleteOutcome.Deleted;
    }

    /// <summary>Active templates for the recruit's department, plus the ones open to everyone.</summary>
    public async Task<IReadOnlyList<AvailableChecklistResponse>> ListAvailableAsync(
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        var departmentId = await db
            .Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.DepartmentId)
            .FirstOrDefaultAsync(cancellationToken);

        var templates = await db
            .ChecklistTemplates.AsNoTracking()
            .Include(t => t.Items)
            .Where(t => t.IsActive && (t.DepartmentId == null || t.DepartmentId == departmentId))
            .OrderBy(t => t.Name)
            .ThenBy(t => t.Id)
            .ToListAsync(cancellationToken);

        var assignments = await db
            .ChecklistAssignments.AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.TemplateId, a => a.Id, cancellationToken);

        return
        [
            .. templates.Select(t => new AvailableChecklistResponse(
                t.Id,
                t.Name,
                t.Description,
                t.Items.Count,
                assignments.ContainsKey(t.Id),
                assignments.TryGetValue(t.Id, out var assignmentId) ? assignmentId : null,
                [.. t.Items.OrderBy(i => i.Position).Select(ChecklistItemResponse.From)]
            )),
        ];
    }

    /// <summary>
    /// Snapshots the template's items into ordinary tasks owned by the recruit. The unique index on
    /// (user_id, template_id) is what rejects a second application, so deleting the generated tasks
    /// never makes the template available again.
    /// </summary>
    public async Task<(ChecklistApplyOutcome Outcome, ApplyChecklistResponse? Result)> ApplyAsync(
        int userId,
        int templateId,
        CancellationToken cancellationToken = default
    )
    {
        var template = await db
            .ChecklistTemplates.AsNoTracking()
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == templateId, cancellationToken);

        var departmentId = await db
            .Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.DepartmentId)
            .FirstOrDefaultAsync(cancellationToken);

        if (
            template is null
            || !template.IsActive
            || (template.DepartmentId is not null && template.DepartmentId != departmentId)
        )
        {
            return (ChecklistApplyOutcome.TemplateNotFound, null);
        }

        if (
            await db.ChecklistAssignments.AnyAsync(
                a => a.UserId == userId && a.TemplateId == templateId,
                cancellationToken
            )
        )
        {
            return (ChecklistApplyOutcome.AlreadyApplied, null);
        }

        var startDate = await db
            .Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);

        var assignment = new ChecklistAssignment
        {
            UserId = userId,
            TemplateId = templateId,
            AppliedAt = now,
        };

        foreach (var item in template.Items.OrderBy(i => i.Position))
        {
            assignment.Tasks.Add(
                new TaskEntry
                {
                    UserId = userId,
                    EntryDate = ChecklistRules.ResolveEntryDate(
                        startDate,
                        today,
                        item.DueOffsetDays
                    ),
                    Title = item.Title,
                    Description = item.Description,
                    Category = item.Category,
                    Status = TaskEntryStatus.Todo,
                    Priority = TaskPriority.Medium,
                    ChecklistItemId = item.Id,
                    CreatedAt = now,
                    UpdatedAt = now,
                }
            );
        }

        db.ChecklistAssignments.Add(assignment);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Only the unique (user_id, template_id) index makes a save conflict expected here.
            db.ChangeTracker.Clear();
            var raced = await db.ChecklistAssignments.AsNoTracking()
                .AnyAsync(
                    a => a.UserId == userId && a.TemplateId == templateId,
                    cancellationToken
                );

            if (!raced)
            {
                throw;
            }

            return (ChecklistApplyOutcome.AlreadyApplied, null);
        }

        var tasks = assignment.Tasks.Select(TaskResponse.From).ToList();
        var progress = new ChecklistProgressResponse(
            assignment.Id,
            template.Id,
            template.Name,
            assignment.AppliedAt,
            tasks.Count,
            0,
            0
        );

        return (
            ChecklistApplyOutcome.Applied,
            new ApplyChecklistResponse(progress, tasks)
        );
    }

    public Task<IReadOnlyList<ChecklistProgressResponse>> ListProgressAsync(
        int userId,
        CancellationToken cancellationToken = default
    ) => ProgressQuery(a => a.UserId == userId, cancellationToken);

    public async Task<ChecklistAssignmentDetailResponse?> GetAssignmentAsync(
        int userId,
        int assignmentId,
        CancellationToken cancellationToken = default
    )
    {
        var progress = await ProgressQuery(
            a => a.Id == assignmentId && a.UserId == userId,
            cancellationToken
        );

        if (progress.Count == 0)
        {
            return null;
        }

        var tasks = await db
            .Tasks.AsNoTracking()
            .Where(t => t.ChecklistAssignmentId == assignmentId)
            .OrderBy(t => t.EntryDate)
            .ThenBy(t => t.Id)
            .Select(t => TaskResponse.From(t))
            .ToListAsync(cancellationToken);

        return new ChecklistAssignmentDetailResponse(progress[0], tasks);
    }

    private async Task<IReadOnlyList<ChecklistProgressResponse>> ProgressQuery(
        System.Linq.Expressions.Expression<Func<ChecklistAssignment, bool>> predicate,
        CancellationToken cancellationToken
    )
    {
        var rows = await db
            .ChecklistAssignments.AsNoTracking()
            .Where(predicate)
            // SQLite cannot order by DateTimeOffset; the identity column is applied-at order.
            .OrderByDescending(a => a.Id)
            .Select(a => new
            {
                a.Id,
                a.TemplateId,
                TemplateName = a.Template!.Name,
                a.AppliedAt,
                Generated = a.Tasks.Count,
                Completed = a.Tasks.Count(t => t.Status == TaskEntryStatus.Done),
            })
            .ToListAsync(cancellationToken);

        return
        [
            .. rows.Select(r => new ChecklistProgressResponse(
                r.Id,
                r.TemplateId,
                r.TemplateName,
                r.AppliedAt,
                r.Generated,
                r.Completed,
                ChecklistRules.CompletionPercentage(r.Generated, r.Completed)
            )),
        ];
    }

    private async Task<bool> DepartmentExistsAsync(
        int? departmentId,
        CancellationToken cancellationToken
    ) =>
        departmentId is not { } id
        || await db.Departments.AnyAsync(d => d.Id == id, cancellationToken);

    private static List<ChecklistItem> BuildItems(IReadOnlyList<ChecklistItemRequest> items) =>
        [
            .. items.Select(
                (item, index) =>
                    new ChecklistItem
                    {
                        Position = index,
                        Title = item.Title.Trim(),
                        Description = item.Description?.Trim(),
                        Category = item.Category,
                        DueOffsetDays = item.DueOffsetDays,
                    }
            ),
        ];

    private static ChecklistTemplateResponse Describe(
        ChecklistTemplate template,
        int assignmentCount
    ) =>
        new(
            template.Id,
            template.Name,
            template.Description,
            template.DepartmentId,
            template.Department?.Name,
            template.IsActive,
            template.Items.Count,
            assignmentCount,
            template.CreatedAt,
            template.UpdatedAt,
            [.. template.Items.OrderBy(i => i.Position).Select(ChecklistItemResponse.From)]
        );
}
