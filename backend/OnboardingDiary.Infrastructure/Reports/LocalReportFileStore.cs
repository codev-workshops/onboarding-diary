using Microsoft.Extensions.Configuration;
using OnboardingDiary.Application.Reports;

namespace OnboardingDiary.Infrastructure.Reports;

public class LocalReportFileStore : IReportFileStore
{
    private readonly string _basePath;

    public LocalReportFileStore(IConfiguration configuration)
    {
        _basePath = configuration["Reports:StoragePath"] ?? Path.Combine(AppContext.BaseDirectory, "reports");
    }

    public async Task<string> SaveAsync(Guid reportId, string extension, byte[] content, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_basePath);
        var fileName = $"{reportId}.{extension}";
        var filePath = Path.Combine(_basePath, fileName);
        await File.WriteAllBytesAsync(filePath, content, ct);
        return fileName;
    }

    public Task<Stream> LoadAsync(string fileUrl, CancellationToken ct = default)
    {
        var filePath = Path.Combine(_basePath, fileUrl);
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"Report file not found: {fileUrl}");
        return Task.FromResult<Stream>(File.OpenRead(filePath));
    }
}
