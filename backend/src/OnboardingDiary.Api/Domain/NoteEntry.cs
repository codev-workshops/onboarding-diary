namespace OnboardingDiary.Api.Domain;

public class NoteEntry
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateOnly EntryDate { get; set; }

    public required string Title { get; set; }

    public required string Content { get; set; }

    public List<NoteTag> Tags { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

public class NoteTag
{
    public int Id { get; set; }

    public int NoteEntryId { get; set; }

    public NoteEntry? NoteEntry { get; set; }

    /// <summary>Stored lower-cased and trimmed so filtering and de-duplication are consistent.</summary>
    public required string Name { get; set; }
}
