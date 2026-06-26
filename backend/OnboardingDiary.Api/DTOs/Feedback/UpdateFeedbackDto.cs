using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Feedback;

public class UpdateFeedbackDto
{
    public DateTime? Date { get; set; }

    [StringLength(200, MinimumLength = 3)]
    public string? Subject { get; set; }

    public FeedbackType? Type { get; set; }

    [StringLength(5000, MinimumLength = 10)]
    public string? Details { get; set; }
}
