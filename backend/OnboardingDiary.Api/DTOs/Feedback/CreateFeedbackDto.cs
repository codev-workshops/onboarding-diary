using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Feedback;

public class CreateFeedbackDto
{
    [Required]
    public DateTime Date { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public FeedbackType Type { get; set; }

    [Required]
    [StringLength(5000, MinimumLength = 10)]
    public string Details { get; set; } = string.Empty;
}
