using FluentValidation.TestHelper;
using OnboardingDiary.Application.Reports.Dtos;
using OnboardingDiary.Application.Reports.Validators;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Tests.Reports;

public class GenerateReportRequestValidatorTests
{
    private readonly GenerateReportRequestValidator _validator = new();

    private static GenerateReportRequest Valid() => new(
        StartDate: DateTime.UtcNow.AddDays(-30),
        EndDate: DateTime.UtcNow,
        Categories: new List<string> { "tasks" },
        RecruitId: null,
        Format: ReportFormat.Pdf);

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task EndDate_BeforeStartDate_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with
        {
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(-10)
        });
        result.ShouldHaveValidationErrorFor(x => x.EndDate);
    }

    [Fact]
    public async Task DateRange_MoreThan365Days_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with
        {
            StartDate = DateTime.UtcNow.AddDays(-400),
            EndDate = DateTime.UtcNow
        });
        result.ShouldHaveValidationErrorFor(x => x.EndDate);
    }

    [Fact]
    public async Task DateRange_Exactly365Days_Passes()
    {
        var start = DateTime.UtcNow.Date;
        var result = await _validator.TestValidateAsync(Valid() with
        {
            StartDate = start,
            EndDate = start.AddDays(365)
        });
        result.ShouldNotHaveValidationErrorFor(x => x.EndDate);
    }

    [Fact]
    public async Task NoCategories_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Categories = new List<string>() });
        result.ShouldHaveValidationErrorFor(x => x.Categories);
    }

    [Fact]
    public async Task InvalidCategory_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with
        {
            Categories = new List<string> { "invalid" }
        });
        result.ShouldHaveValidationErrorFor(x => x.Categories);
    }

    [Fact]
    public async Task AllCategory_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with
        {
            Categories = new List<string> { "all" }
        });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task MultipleValidCategories_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with
        {
            Categories = new List<string> { "tasks", "issues", "feedback", "notes" }
        });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task InvalidFormat_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Format = (ReportFormat)99 });
        result.ShouldHaveValidationErrorFor(x => x.Format);
    }

    [Fact]
    public async Task CsvFormat_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Format = ReportFormat.Csv });
        result.ShouldNotHaveAnyValidationErrors();
    }
}
