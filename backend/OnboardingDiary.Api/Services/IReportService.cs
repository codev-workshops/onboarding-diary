using OnboardingDiary.Api.DTOs.Reports;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public interface IReportService
{
    Task<ReportResponseDto> GenerateReportAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole);
    Task<byte[]> GeneratePdfAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole);
    Task<byte[]> GenerateCsvAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole);
}
