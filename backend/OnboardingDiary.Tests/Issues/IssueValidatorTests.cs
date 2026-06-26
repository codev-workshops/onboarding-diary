using FluentValidation.TestHelper;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Application.Issues.Validators;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Tests.Issues;

public class CreateIssueValidatorTests
{
    private readonly CreateIssueRequestValidator _validator = new();

    private static CreateIssueRequest Valid() => new(
        Date: DateTime.UtcNow.Date,
        Title: "Valid Issue Title",
        Description: "A description that is at least ten characters long",
        Severity: IssueSeverity.Medium,
        Status: IssueStatus.Open);

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Title_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = "" });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Title_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = "ab" });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Title_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = new string('a', 151) });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Title_LeadingWhitespace_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = " Leading" });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Title_TrailingWhitespace_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = "Trailing " });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Date_InFuture_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Date = DateTime.UtcNow.AddDays(5) });
        result.ShouldHaveValidationErrorFor(x => x.Date);
    }

    [Fact]
    public async Task Description_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Description = "" });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Description_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Description = "Short" });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Description_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Description = new string('x', 3001) });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Invalid_Severity_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Severity = (IssueSeverity)99 });
        result.ShouldHaveValidationErrorFor(x => x.Severity);
    }

    [Fact]
    public async Task Invalid_Status_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Status = (IssueStatus)99 });
        result.ShouldHaveValidationErrorFor(x => x.Status);
    }
}

public class UpdateIssueValidatorTests
{
    private readonly UpdateIssueRequestValidator _validator = new();

    private static UpdateIssueRequest Valid() => new(
        Title: "Valid Issue Title",
        Description: "A description that is at least ten characters long",
        Severity: IssueSeverity.Medium,
        Status: IssueStatus.InProgress,
        ResolutionNotes: null);

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Resolved_WithoutResolutionNotes_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Resolved, ResolutionNotes = null });
        result.ShouldHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task Resolved_WithEmptyResolutionNotes_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Resolved, ResolutionNotes = "" });
        result.ShouldHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task Closed_WithoutResolutionNotes_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Closed, ResolutionNotes = null });
        result.ShouldHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task Resolved_WithResolutionNotes_Passes()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Resolved, ResolutionNotes = "Fixed the problem" });
        result.ShouldNotHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task Closed_WithResolutionNotes_Passes()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Closed, ResolutionNotes = "Won't fix" });
        result.ShouldNotHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task ResolutionNotes_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = IssueStatus.Resolved, ResolutionNotes = new string('x', 2001) });
        result.ShouldHaveValidationErrorFor(x => x.ResolutionNotes);
    }

    [Fact]
    public async Task Title_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Title = "ab" });
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public async Task Description_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Description = "Short" });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }
}

public class EscalateIssueValidatorTests
{
    private readonly EscalateIssueRequestValidator _validator = new();

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(new EscalateIssueRequest("Need help"));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Empty_Message_Fails()
    {
        var result = await _validator.TestValidateAsync(new EscalateIssueRequest(""));
        result.ShouldHaveValidationErrorFor(x => x.Message);
    }

    [Fact]
    public async Task Message_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(new EscalateIssueRequest(new string('x', 2001)));
        result.ShouldHaveValidationErrorFor(x => x.Message);
    }
}
