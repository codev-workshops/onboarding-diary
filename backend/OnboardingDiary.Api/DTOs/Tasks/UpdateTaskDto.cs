using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Tasks;

public class UpdateTaskDto
{
    public DateTime? Date { get; set; }

    [StringLength(200, MinimumLength = 3)]
    public string? Title { get; set; }

    [StringLength(5000)]
    public string? Description { get; set; }

    public string? Category { get; set; }

    public TaskEntryStatus? Status { get; set; }

    public Priority? Priority { get; set; }
}
