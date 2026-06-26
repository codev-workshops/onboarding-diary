using FluentValidation.TestHelper;
using OnboardingDiary.Application.Feedback.Dtos;
using OnboardingDiary.Application.Feedback.Validators;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Tests.Feedback;

public class CreateFeedbackValidatorTests
{
    private readonly CreateFeedbackRequestValidator _validator = new();

    private static CreateFeedbackRequest Valid() => new(
        Date: DateTime.UtcNow.Date,
        Subject: "Valid Feedback Subject",
        Type: FeedbackType.Positive,
        Details: "This is a valid feedback detail that is at least twenty characters long.");

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Subject_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = "" });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Subject_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = "ab" });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Subject_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = new string('a', 151) });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Subject_LeadingWhitespace_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = " Leading" });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Subject_TrailingWhitespace_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = "Trailing " });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Date_InFuture_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Date = DateTime.UtcNow.AddDays(5) });
        result.ShouldHaveValidationErrorFor(x => x.Date);
    }

    [Fact]
    public async Task Details_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Details = "" });
        result.ShouldHaveValidationErrorFor(x => x.Details);
    }

    [Fact]
    public async Task Details_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Details = "Short details." });
        result.ShouldHaveValidationErrorFor(x => x.Details);
    }

    [Fact]
    public async Task Details_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Details = new string('x', 5001) });
        result.ShouldHaveValidationErrorFor(x => x.Details);
    }

    [Fact]
    public async Task Details_ExactlyMinLength_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Details = new string('a', 20) });
        result.ShouldNotHaveValidationErrorFor(x => x.Details);
    }

    [Fact]
    public async Task Invalid_Type_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Type = (FeedbackType)99 });
        result.ShouldHaveValidationErrorFor(x => x.Type);
    }
}

public class UpdateFeedbackValidatorTests
{
    private readonly UpdateFeedbackRequestValidator _validator = new();

    private static UpdateFeedbackRequest Valid() => new(
        Subject: "Valid Feedback Subject",
        Type: FeedbackType.Suggestion,
        Details: "This is a valid feedback detail that is at least twenty characters long.");

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Subject_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Subject = "" });
        result.ShouldHaveValidationErrorFor(x => x.Subject);
    }

    [Fact]
    public async Task Details_TooShort_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Details = "Too short." });
        result.ShouldHaveValidationErrorFor(x => x.Details);
    }

    [Fact]
    public async Task Invalid_Type_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Type = (FeedbackType)99 });
        result.ShouldHaveValidationErrorFor(x => x.Type);
    }
}
