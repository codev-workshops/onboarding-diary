using FluentValidation.TestHelper;
using OnboardingDiary.Application.Notes.Dtos;
using OnboardingDiary.Application.Notes.Validators;

namespace OnboardingDiary.Tests.Notes;

public class CreateNoteValidatorTests
{
    private readonly CreateNoteRequestValidator _validator = new();

    private static CreateNoteRequest Valid() => new(
        Date: DateTime.UtcNow.Date,
        Title: "Valid Note Title",
        Content: "Some content here",
        Tags: new List<string> { "onboarding", "day-1" },
        IsPinned: false);

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
        var result = await _validator.TestValidateAsync(Valid() with { Title = new string('a', 201) });
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
    public async Task Content_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Content = "" });
        result.ShouldHaveValidationErrorFor(x => x.Content);
    }

    [Fact]
    public async Task Content_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Content = new string('x', 10001) });
        result.ShouldHaveValidationErrorFor(x => x.Content);
    }

    [Fact]
    public async Task Content_MaxLength_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Content = new string('x', 10000) });
        result.ShouldNotHaveValidationErrorFor(x => x.Content);
    }

    [Fact]
    public async Task Tags_TooMany_Fails()
    {
        var tags = Enumerable.Range(0, 11).Select(i => $"tag{i}").ToList();
        var result = await _validator.TestValidateAsync(Valid() with { Tags = tags });
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = new List<string> { new string('a', 31) } });
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_InvalidChars_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = new List<string> { "invalid tag!" } });
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_ValidFormat_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = new List<string> { "valid-tag", "tag2", "ABC" } });
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_Null_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = null });
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_Empty_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = new List<string>() });
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Date_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Date = default });
        result.ShouldHaveValidationErrorFor(x => x.Date);
    }
}

public class UpdateNoteValidatorTests
{
    private readonly UpdateNoteRequestValidator _validator = new();

    private static UpdateNoteRequest Valid() => new(
        Title: "Valid Note Title",
        Content: "Some content",
        Tags: new List<string> { "tag1" },
        IsPinned: false);

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
    public async Task Content_Empty_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Content = "" });
        result.ShouldHaveValidationErrorFor(x => x.Content);
    }

    [Fact]
    public async Task Tags_InvalidChars_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Tags = new List<string> { "bad tag" } });
        result.ShouldHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public async Task Tags_MaxCount_Passes()
    {
        var tags = Enumerable.Range(0, 10).Select(i => $"tag{i}").ToList();
        var result = await _validator.TestValidateAsync(Valid() with { Tags = tags });
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }
}
