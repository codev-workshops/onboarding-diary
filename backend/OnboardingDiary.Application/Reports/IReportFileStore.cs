namespace OnboardingDiary.Application.Reports;

public interface IReportFileStore
{
    Task<string> SaveAsync(Guid reportId, string extension, byte[] content, CancellationToken ct = default);
    Task<Stream> LoadAsync(string fileUrl, CancellationToken ct = default);
}
