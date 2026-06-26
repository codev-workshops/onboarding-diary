using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Notes.Dtos;

namespace OnboardingDiary.Application.Notes;

public interface INoteService
{
    Task<PagedResult<NoteDto>> ListAsync(NoteListQuery query, CancellationToken ct = default);
    Task<NoteDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<NoteDto> CreateAsync(CreateNoteRequest request, CancellationToken ct = default);
    Task<NoteDto?> UpdateAsync(Guid id, UpdateNoteRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
