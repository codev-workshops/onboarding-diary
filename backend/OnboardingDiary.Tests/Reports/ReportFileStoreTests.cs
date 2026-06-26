using Microsoft.Extensions.Configuration;
using OnboardingDiary.Infrastructure.Reports;

namespace OnboardingDiary.Tests.Reports;

public class LocalReportFileStoreTests : IDisposable
{
    private readonly string _tempDir;
    private readonly LocalReportFileStore _store;

    public LocalReportFileStoreTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), "report_tests_" + Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Reports:StoragePath", _tempDir }
            })
            .Build();
        _store = new LocalReportFileStore(config);
    }

    [Fact]
    public async Task SaveAndLoad_RoundTrip()
    {
        var reportId = Guid.NewGuid();
        var content = System.Text.Encoding.UTF8.GetBytes("test content");

        var fileUrl = await _store.SaveAsync(reportId, "pdf", content);

        Assert.NotNull(fileUrl);
        Assert.Contains(reportId.ToString(), fileUrl);

        using var stream = await _store.LoadAsync(fileUrl);
        using var reader = new StreamReader(stream);
        var loaded = await reader.ReadToEndAsync();

        Assert.Equal("test content", loaded);
    }

    [Fact]
    public async Task Load_NonExistentFile_Throws()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(
            () => _store.LoadAsync("nonexistent.pdf"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }
}
