using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Notes;

namespace OnboardingDiary.Api.Services;

public interface INoteService
{
    Task<PaginatedResponse<NoteResponseDto>> GetAllAsync(
        int currentUserId,
        string currentUserRole,
        int? userId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? tags,
        PaginationParams paginationParams);

    Task<NoteResponseDto> GetByIdAsync(int id, int currentUserId, string currentUserRole);
    Task<NoteResponseDto> CreateAsync(int userId, CreateNoteDto dto);
    Task<NoteResponseDto> UpdateAsync(int id, int currentUserId, UpdateNoteDto dto);
    Task DeleteAsync(int id, int currentUserId);
}
