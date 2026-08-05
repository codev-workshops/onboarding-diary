using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Api.Contracts;

public record TaskEntryRequest(
    [Required] DateOnly Date,
    [Required, MinLength(1), MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description,
    [Required] TaskCategory Category,
    [Required] TaskStatus Status,
    [Required] TaskPriority Priority);

public record TaskEntryResponse(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    string Title,
    string? Description,
    TaskCategory Category,
    TaskStatus Status,
    TaskPriority Priority)
{
    public static TaskEntryResponse From(TaskEntry entry) => new(
        entry.Id, entry.UserId, entry.Date, entry.Title, entry.Description,
        entry.Category, entry.Status, entry.Priority);
}

public record IssueEntryRequest(
    [Required] DateOnly Date,
    [Required, MinLength(1), MaxLength(200)] string Title,
    [Required, MinLength(1), MaxLength(2000)] string Description,
    [Required] IssueSeverity Severity,
    [Required] IssueStatus Status,
    [MaxLength(2000)] string? ResolutionNotes);

public record IssueEntryResponse(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    string Title,
    string Description,
    IssueSeverity Severity,
    IssueStatus Status,
    string? ResolutionNotes)
{
    public static IssueEntryResponse From(IssueEntry entry) => new(
        entry.Id, entry.UserId, entry.Date, entry.Title, entry.Description,
        entry.Severity, entry.Status, entry.ResolutionNotes);
}

public record FeedbackRequest(
    [Required] DateOnly Date,
    [Required, MinLength(1), MaxLength(200)] string Subject,
    [Required] FeedbackType Type,
    [Required, MinLength(1), MaxLength(2000)] string Details);

public record FeedbackResponse(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    string Subject,
    FeedbackType Type,
    string Details)
{
    public static FeedbackResponse From(FeedbackNote entry) => new(
        entry.Id, entry.UserId, entry.Date, entry.Subject, entry.Type, entry.Details);
}

public record NoteRequest(
    [Required] DateOnly Date,
    [Required, MinLength(1), MaxLength(200)] string Title,
    [Required, MinLength(1), MaxLength(5000)] string Content,
    [MaxLength(10)] IReadOnlyList<string>? Tags);

public record NoteResponse(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    string Title,
    string Content,
    IReadOnlyList<string> Tags)
{
    public static NoteResponse From(Note entry) => new(
        entry.Id, entry.UserId, entry.Date, entry.Title, entry.Content, entry.Tags);
}
