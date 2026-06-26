using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Notes;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Extensions;
using OnboardingDiary.Api.Repositories;

namespace OnboardingDiary.Api.Services;

public class NoteService : INoteService
{
    private readonly INoteRepository _noteRepository;
    private readonly AppDbContext _context;

    public NoteService(INoteRepository noteRepository, AppDbContext context)
    {
        _noteRepository = noteRepository;
        _context = context;
    }

    public async Task<PaginatedResponse<NoteResponseDto>> GetAllAsync(
        int currentUserId,
        string currentUserRole,
        int? userId,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? tags,
        PaginationParams paginationParams)
    {
        var query = _noteRepository.QueryWithTags();

        if (currentUserRole == "Admin")
        {
            if (userId.HasValue)
                query = query.Where(n => n.UserId == userId.Value);
        }
        else if (currentUserRole == "Manager")
        {
            if (userId.HasValue)
            {
                var managedUserIds = await _context.Users
                    .Where(u => u.ManagerId == currentUserId)
                    .Select(u => u.Id)
                    .ToListAsync();
                managedUserIds.Add(currentUserId);

                if (!managedUserIds.Contains(userId.Value))
                    throw new UnauthorizedAccessException("You do not have access to this user's notes.");

                query = query.Where(n => n.UserId == userId.Value);
            }
            else
            {
                var managedUserIds = await _context.Users
                    .Where(u => u.ManagerId == currentUserId)
                    .Select(u => u.Id)
                    .ToListAsync();
                managedUserIds.Add(currentUserId);
                query = query.Where(n => managedUserIds.Contains(n.UserId));
            }
        }
        else
        {
            query = query.Where(n => n.UserId == currentUserId);
        }

        query = _noteRepository.QueryByDateRange(query, dateFrom, dateTo);

        if (!string.IsNullOrWhiteSpace(tags))
        {
            var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            query = _noteRepository.QueryByTags(query, tagList);
        }

        var sortBy = paginationParams.SortBy;
        if (string.IsNullOrWhiteSpace(sortBy))
            sortBy = "Date";
        else
            sortBy = AllowedSortFields.FirstOrDefault(f => string.Equals(f, sortBy, StringComparison.OrdinalIgnoreCase)) ?? "Date";

        query = query.OrderByProperty(sortBy, paginationParams.SortDescending);

        var paginatedResult = await query
            .Select(n => new NoteResponseDto
            {
                Id = n.Id,
                UserId = n.UserId,
                Date = n.Date,
                Title = n.Title,
                Content = n.Content,
                Tags = n.Tags.Select(t => t.Tag).ToArray(),
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            })
            .ToPaginatedResponseAsync(paginationParams);

        return paginatedResult;
    }

    public async Task<NoteResponseDto> GetByIdAsync(int id, int currentUserId, string currentUserRole)
    {
        var note = await _noteRepository.GetByIdWithTagsAsync(id)
            ?? throw new KeyNotFoundException("Note not found.");

        if (currentUserRole == "Admin")
        {
            // Admin can view all
        }
        else if (currentUserRole == "Manager")
        {
            if (note.UserId != currentUserId)
            {
                var isManaged = await _context.Users
                    .AnyAsync(u => u.Id == note.UserId && u.ManagerId == currentUserId);
                if (!isManaged)
                    throw new UnauthorizedAccessException("You do not have access to this note.");
            }
        }
        else if (note.UserId != currentUserId)
        {
            throw new UnauthorizedAccessException("You do not have access to this note.");
        }

        return MapToResponseDto(note);
    }

    public async Task<NoteResponseDto> CreateAsync(int userId, CreateNoteDto dto)
    {
        ValidateDate(dto.Date);
        var processedTags = ProcessTags(dto.Tags);

        var note = new NoteEntry
        {
            UserId = userId,
            Date = dto.Date,
            Title = dto.Title,
            Content = dto.Content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var tag in processedTags)
        {
            note.Tags.Add(new NoteTag { Tag = tag });
        }

        await _noteRepository.AddAsync(note);

        return await GetByIdWithoutAuthCheckAsync(note.Id);
    }

    public async Task<NoteResponseDto> UpdateAsync(int id, int currentUserId, UpdateNoteDto dto)
    {
        var note = await _noteRepository.GetByIdWithTagsAsync(id)
            ?? throw new KeyNotFoundException("Note not found.");

        if (note.UserId != currentUserId)
            throw new UnauthorizedAccessException("You can only edit your own notes.");

        ValidateDate(dto.Date);
        var processedTags = ProcessTags(dto.Tags);

        note.Date = dto.Date;
        note.Title = dto.Title;
        note.Content = dto.Content;
        note.UpdatedAt = DateTime.UtcNow;

        note.Tags.Clear();

        foreach (var tag in processedTags)
        {
            note.Tags.Add(new NoteTag { Tag = tag });
        }

        await _context.SaveChangesAsync();

        return MapToResponseDto(note);
    }

    public async Task DeleteAsync(int id, int currentUserId)
    {
        var note = await _noteRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Note not found.");

        if (note.UserId != currentUserId)
            throw new UnauthorizedAccessException("You can only delete your own notes.");

        await _noteRepository.DeleteAsync(note);
    }

    private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "Date", "Title", "CreatedAt", "UpdatedAt"
    };

    private async Task<NoteResponseDto> GetByIdWithoutAuthCheckAsync(int id)
    {
        var note = await _noteRepository.GetByIdWithTagsAsync(id)
            ?? throw new KeyNotFoundException("Note not found.");
        return MapToResponseDto(note);
    }

    private static void ValidateDate(DateTime date)
    {
        if (date.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("Date cannot be in the future.");
    }

    private static string[] ProcessTags(string[]? tags)
    {
        if (tags == null || tags.Length == 0)
            return Array.Empty<string>();

        var tagPattern = new Regex(@"^[a-zA-Z0-9\-]+$");

        var processed = tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim().ToLower())
            .Where(t => t.Length >= 1 && t.Length <= 50)
            .Where(t => tagPattern.IsMatch(t))
            .Distinct()
            .Take(10)
            .ToArray();

        return processed;
    }

    private static NoteResponseDto MapToResponseDto(NoteEntry note)
    {
        return new NoteResponseDto
        {
            Id = note.Id,
            UserId = note.UserId,
            Date = note.Date,
            Title = note.Title,
            Content = note.Content,
            Tags = note.Tags.Select(t => t.Tag).ToArray(),
            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt
        };
    }
}
