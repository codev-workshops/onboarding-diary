using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Issues;

public class CreateIssueDto
{
    [Required]
    public DateTime Date { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(5000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public IssueSeverity Severity { get; set; }

    [Required]
    public IssueStatus Status { get; set; }

    [StringLength(5000, MinimumLength = 10)]
    public string? ResolutionNotes { get; set; }
}
