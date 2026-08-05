using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Api.Controllers;

[Route("api/tasks")]
public class TasksController(AppDbContext db, EntryAccess access)
    : EntryControllerBase<TaskEntry, TaskEntryRequest, TaskEntryResponse>(db, access)
{
    [FromQuery(Name = "category")]
    public TaskCategory? Category { get; set; }

    [FromQuery(Name = "status")]
    public TaskStatus? Status { get; set; }

    protected override DbSet<TaskEntry> Entries => Db.Tasks;

    protected override IQueryable<TaskEntry> Filter(IQueryable<TaskEntry> query)
    {
        if (Category is { } category) query = query.Where(t => t.Category == category);
        if (Status is { } status) query = query.Where(t => t.Status == status);
        return query;
    }

    protected override void Apply(TaskEntryRequest request, TaskEntry entry)
    {
        entry.Date = request.Date;
        entry.Title = request.Title.Trim();
        entry.Description = request.Description?.Trim();
        entry.Category = request.Category;
        entry.Status = request.Status;
        entry.Priority = request.Priority;
    }

    protected override TaskEntryResponse Map(TaskEntry entry) => TaskEntryResponse.From(entry);
}
