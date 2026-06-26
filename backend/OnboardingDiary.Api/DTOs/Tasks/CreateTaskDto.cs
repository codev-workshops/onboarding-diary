using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Tasks;

public class CreateTaskDto
{
    [Required]
    public DateTime Date { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [StringLength(5000)]
    public string? Description { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    public TaskEntryStatus Status { get; set; }

    [Required]
    public Priority Priority { get; set; }
}
