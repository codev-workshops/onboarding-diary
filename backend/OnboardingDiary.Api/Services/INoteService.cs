using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface INoteService
{
    Task<PagedResult<NoteDto>> GetAsync(NoteQuery query, CancellationToken cancellationToken = default);

    Task<NoteDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<NoteDto> CreateAsync(SaveNoteRequest request, CancellationToken cancellationToken = default);

    Task<NoteDto> UpdateAsync(int id, SaveNoteRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
