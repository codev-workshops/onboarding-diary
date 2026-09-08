using FluentValidation;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Notes;

public record CreateNoteRequest(
    DateOnly EntryDate,
    string Title,
    string Content,
    IReadOnlyList<string>? Tags
);

public record UpdateNoteRequest(
    DateOnly EntryDate,
    string Title,
    string Content,
    IReadOnlyList<string>? Tags
);

public record NoteResponse(
    int Id,
    int UserId,
    DateOnly EntryDate,
    string Title,
    string Content,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
)
{
    public static NoteResponse From(NoteEntry note) =>
        new(
            note.Id,
            note.UserId,
            note.EntryDate,
            note.Title,
            note.Content,
            note.Tags.Select(t => t.Name).Order().ToList(),
            note.CreatedAt,
            note.UpdatedAt
        );
}

public record NoteListQuery(
    DateOnly? From,
    DateOnly? To,
    string? Tag,
    string? Q,
    int? UserId,
    int Page = 1,
    int PageSize = 20
);

public static class NoteTags
{
    public const int MaxTags = 10;

    public const int MaxTagLength = 40;

    /// <summary>Trims, lower-cases and de-duplicates tags so filtering is predictable.</summary>
    public static List<string> Normalise(IReadOnlyList<string>? tags) =>
        (tags ?? [])
            .Select(tag => tag.Trim().ToLowerInvariant())
            .Where(tag => tag.Length > 0)
            .Distinct()
            .ToList();
}

public class CreateNoteRequestValidator : AbstractValidator<CreateNoteRequest>
{
    public CreateNoteRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Content).NotEmpty().MaximumLength(10000);
        RuleFor(r => r.Tags).TagList();
    }
}

public class UpdateNoteRequestValidator : AbstractValidator<UpdateNoteRequest>
{
    public UpdateNoteRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Content).NotEmpty().MaximumLength(10000);
        RuleFor(r => r.Tags).TagList();
    }
}

public static class NoteTagRules
{
    public static IRuleBuilderOptions<T, IReadOnlyList<string>?> TagList<T>(
        this IRuleBuilder<T, IReadOnlyList<string>?> rule
    ) =>
        rule.Must(tags => NoteTags.Normalise(tags).Count <= NoteTags.MaxTags)
            .WithMessage($"A note can carry at most {NoteTags.MaxTags} tags.")
            .Must(tags =>
                NoteTags.Normalise(tags).All(tag => tag.Length <= NoteTags.MaxTagLength)
            )
            .WithMessage($"Tags cannot be longer than {NoteTags.MaxTagLength} characters.");
}
