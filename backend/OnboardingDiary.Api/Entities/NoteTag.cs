namespace OnboardingDiary.Api.Entities;

public class NoteTag
{
    public int Id { get; set; }
    public int NoteEntryId { get; set; }
    public string Tag { get; set; } = string.Empty;

    public NoteEntry NoteEntry { get; set; } = null!;
}
