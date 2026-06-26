using System.ComponentModel.DataAnnotations;

namespace OnboardingDiary.Api.DTOs.Users;

public class UpdateProfileRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Department { get; set; } = string.Empty;
}
