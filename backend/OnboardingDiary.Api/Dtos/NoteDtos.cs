namespace OnboardingDiary.Api.Dtos;

public class NoteDto
{
    public int Id { get; init; }

    public int UserId { get; init; }

    public string UserName { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string Title { get; init; } = string.Empty;

    public string? Content { get; init; }

    public IReadOnlyList<string> Tags { get; init; } = Array.Empty<string>();

    public DateTime CreatedAtUtc { get; init; }

    public DateTime UpdatedAtUtc { get; init; }
}

public class SaveNoteRequest
{
    public DateTime Date { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    public List<string> Tags { get; set; } = new();
}

public class NoteQuery : PagedQuery
{
    public string? Tag { get; set; }
}
