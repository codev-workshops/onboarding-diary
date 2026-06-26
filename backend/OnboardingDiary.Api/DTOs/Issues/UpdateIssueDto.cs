using System.ComponentModel.DataAnnotations;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Issues;

public class UpdateIssueDto
{
    public DateTime? Date { get; set; }

    [StringLength(200, MinimumLength = 3)]
    public string? Title { get; set; }

    [StringLength(5000, MinimumLength = 10)]
    public string? Description { get; set; }

    public IssueSeverity? Severity { get; set; }

    public IssueStatus? Status { get; set; }

    [StringLength(5000, MinimumLength = 10)]
    public string? ResolutionNotes { get; set; }
}
