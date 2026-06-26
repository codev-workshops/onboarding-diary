namespace OnboardingDiary.Application.Dashboard.Dtos;

public record TeamDashboardDto(
    IReadOnlyList<TeamRecruitDto> Recruits);
