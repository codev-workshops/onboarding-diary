using FluentValidation.TestHelper;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Application.Users.Validators;

namespace OnboardingDiary.Tests.Users;

public class UpdateProfileRequestValidatorTests
{
    private readonly UpdateProfileRequestValidator _validator = new();

    private static UpdateProfileRequest Valid() => new(
        Name: "Jane Doe",
        Department: "Engineering",
        StartDate: DateTime.UtcNow.Date,
        AvatarUrl: null);

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("A")]
    public async Task Name_TooShort_Fails(string name)
    {
        var result = await _validator.TestValidateAsync(Valid() with { Name = name });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public async Task Name_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Name = new string('A', 101) });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData("John123")]
    [InlineData("John@Doe")]
    [InlineData("John_Doe")]
    public async Task Name_InvalidChars_Fails(string name)
    {
        var result = await _validator.TestValidateAsync(Valid() with { Name = name });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData("Jane Doe")]
    [InlineData("O'Brien")]
    [InlineData("Smith-Jones")]
    public async Task Name_ValidPatterns_Passes(string name)
    {
        var result = await _validator.TestValidateAsync(Valid() with { Name = name });
        result.ShouldNotHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public async Task Department_Invalid_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Department = "Nonexistent" });
        result.ShouldHaveValidationErrorFor(x => x.Department);
    }

    [Fact]
    public async Task Department_Valid_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Department = "HR" });
        result.ShouldNotHaveValidationErrorFor(x => x.Department);
    }

    [Fact]
    public async Task StartDate_TooFarFuture_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { StartDate = DateTime.UtcNow.Date.AddDays(31) });
        result.ShouldHaveValidationErrorFor(x => x.StartDate);
    }

    [Fact]
    public async Task StartDate_TooFarPast_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { StartDate = DateTime.UtcNow.Date.AddYears(-1).AddDays(-1) });
        result.ShouldHaveValidationErrorFor(x => x.StartDate);
    }

    [Fact]
    public async Task StartDate_Within30DaysFuture_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { StartDate = DateTime.UtcNow.Date.AddDays(29) });
        result.ShouldNotHaveValidationErrorFor(x => x.StartDate);
    }

    [Fact]
    public async Task AvatarUrl_Null_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { AvatarUrl = null });
        result.ShouldNotHaveValidationErrorFor(x => x.AvatarUrl);
    }

    [Fact]
    public async Task AvatarUrl_ValidHttps_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid() with { AvatarUrl = "https://example.com/pic.png" });
        result.ShouldNotHaveValidationErrorFor(x => x.AvatarUrl);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com/pic.png")]
    public async Task AvatarUrl_Invalid_Fails(string url)
    {
        var result = await _validator.TestValidateAsync(Valid() with { AvatarUrl = url });
        result.ShouldHaveValidationErrorFor(x => x.AvatarUrl);
    }
}

public class UpdateRoleRequestValidatorTests
{
    private readonly UpdateRoleRequestValidator _validator = new();

    [Fact]
    public async Task Valid_Role_Passes()
    {
        var result = await _validator.TestValidateAsync(new UpdateRoleRequest(Domain.Enums.Role.Manager));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Invalid_Role_Fails()
    {
        var result = await _validator.TestValidateAsync(new UpdateRoleRequest((Domain.Enums.Role)99));
        result.ShouldHaveValidationErrorFor(x => x.Role);
    }
}
