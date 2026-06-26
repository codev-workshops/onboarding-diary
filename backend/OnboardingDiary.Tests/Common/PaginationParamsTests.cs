using OnboardingDiary.Application.Common;

namespace OnboardingDiary.Tests.Common;

public class PaginationParamsTests
{
    [Fact]
    public void Normalize_DefaultValues_Page1Limit20()
    {
        var (page, limit) = PaginationParams.Normalize(0, 0);
        Assert.Equal(1, page);
        Assert.Equal(PaginationParams.DefaultLimit, limit);
    }

    [Fact]
    public void Normalize_NegativePage_ClampsToOne()
    {
        var (page, _) = PaginationParams.Normalize(-5, 20);
        Assert.Equal(1, page);
    }

    [Fact]
    public void Normalize_ValidValues_ReturnsAsIs()
    {
        var (page, limit) = PaginationParams.Normalize(3, 50);
        Assert.Equal(3, page);
        Assert.Equal(50, limit);
    }

    [Fact]
    public void Normalize_LimitExceedsMax_ClampsTo100()
    {
        var (_, limit) = PaginationParams.Normalize(1, 1000);
        Assert.Equal(PaginationParams.MaxLimit, limit);
    }

    [Fact]
    public void Normalize_LimitAt100_Returns100()
    {
        var (_, limit) = PaginationParams.Normalize(1, 100);
        Assert.Equal(100, limit);
    }

    [Fact]
    public void Normalize_LimitAtZero_DefaultsTo20()
    {
        var (_, limit) = PaginationParams.Normalize(1, 0);
        Assert.Equal(20, limit);
    }

    [Fact]
    public void Normalize_NegativeLimit_DefaultsTo20()
    {
        var (_, limit) = PaginationParams.Normalize(1, -10);
        Assert.Equal(20, limit);
    }

    [Fact]
    public void Normalize_LimitAtOne_ReturnsOne()
    {
        var (_, limit) = PaginationParams.Normalize(1, 1);
        Assert.Equal(1, limit);
    }

    [Fact]
    public void Constants_AreCorrect()
    {
        Assert.Equal(20, PaginationParams.DefaultLimit);
        Assert.Equal(100, PaginationParams.MaxLimit);
        Assert.Equal(1, PaginationParams.MinPage);
    }
}
