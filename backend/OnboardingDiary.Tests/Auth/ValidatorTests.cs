using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Auth.Validators;

namespace OnboardingDiary.Tests.Auth;

public class ValidatorTests
{
    private readonly RegisterRequestValidator _registerValidator = new();
    private readonly ResetPasswordRequestValidator _resetValidator = new();

    private static RegisterRequest ValidRegister() => new(
        Email: "user@example.com",
        Password: "Str0ng!Pass",
        Name: "Jane Doe",
        Department: "Engineering",
        StartDate: DateTime.UtcNow);

    [Fact]
    public void RegisterValidator_ValidRequest_Passes()
    {
        var result = _registerValidator.Validate(ValidRegister());
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void RegisterValidator_InvalidEmail_Fails(string email)
    {
        var req = ValidRegister() with { Email = email };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "Email");
    }

    [Fact]
    public void RegisterValidator_EmailExceeding254Chars_Fails()
    {
        var longEmail = new string('a', 246) + "@test.com";
        var req = ValidRegister() with { Email = longEmail };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("short")]
    [InlineData("nouppercase1!")]
    [InlineData("NOLOWERCASE1!")]
    [InlineData("NoDigit!!abc")]
    [InlineData("NoSpecial1ab")]
    public void RegisterValidator_WeakPassword_Fails(string password)
    {
        var req = ValidRegister() with { Password = password };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("A")]
    [InlineData("")]
    [InlineData("Name123")]
    public void RegisterValidator_InvalidName_Fails(string name)
    {
        var req = ValidRegister() with { Name = name };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void RegisterValidator_ValidNameWithHyphenAndApostrophe_Passes()
    {
        var req = ValidRegister() with { Name = "O'Brien-Smith" };
        var result = _registerValidator.Validate(req);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void RegisterValidator_InvalidDepartment_Fails()
    {
        var req = ValidRegister() with { Department = "InvalidDept" };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void RegisterValidator_StartDateTooFarInFuture_Fails()
    {
        var req = ValidRegister() with { StartDate = DateTime.UtcNow.AddDays(60) };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void RegisterValidator_StartDateTooFarInPast_Fails()
    {
        var req = ValidRegister() with { StartDate = DateTime.UtcNow.AddYears(-2) };
        var result = _registerValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ResetPasswordValidator_ValidRequest_Passes()
    {
        var req = new ResetPasswordRequest("sometoken", "NewStr0ng!Pass");
        var result = _resetValidator.Validate(req);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ResetPasswordValidator_WeakPassword_Fails()
    {
        var req = new ResetPasswordRequest("token", "weak");
        var result = _resetValidator.Validate(req);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ResetPasswordValidator_EmptyToken_Fails()
    {
        var req = new ResetPasswordRequest("", "Str0ng!Pass");
        var result = _resetValidator.Validate(req);
        Assert.False(result.IsValid);
    }
}
