using FluentValidation.TestHelper;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Application.Tasks.Validators;
using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Tasks;

public class CreateTaskValidatorTests
{
    private readonly CreateTaskRequestValidator _validator = new();

    private static CreateTaskRequest Valid() => new(
        Date: DateTime.UtcNow.Date,
        Title: "Valid Task",
        Description: "Some description",
        Category: TaskCategory.Training,
        Status: TaskStatus.NotStarted,
        Priority: Priority.Medium);

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
        var result = await _validator.TestValidateAsync(Valid() with { Title = new string('a', 101) });
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
    public async Task Description_TooLong_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Description = new string('x', 2001) });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Completed_WithoutDescription_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = TaskStatus.Completed, Description = null });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Completed_WithEmptyDescription_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = TaskStatus.Completed, Description = "" });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Completed_WithDescription_Passes()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = TaskStatus.Completed, Description = "Done!" });
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Invalid_Category_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Category = (TaskCategory)99 });
        result.ShouldHaveValidationErrorFor(x => x.Category);
    }

    [Fact]
    public async Task Invalid_Status_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Status = (TaskStatus)99 });
        result.ShouldHaveValidationErrorFor(x => x.Status);
    }

    [Fact]
    public async Task Invalid_Priority_Fails()
    {
        var result = await _validator.TestValidateAsync(Valid() with { Priority = (Priority)99 });
        result.ShouldHaveValidationErrorFor(x => x.Priority);
    }
}

public class UpdateTaskValidatorTests
{
    private readonly UpdateTaskRequestValidator _validator = new();

    private static UpdateTaskRequest Valid() => new(
        Date: DateTime.UtcNow.Date,
        Title: "Valid Task",
        Description: "Some description",
        Category: TaskCategory.Training,
        Status: TaskStatus.InProgress,
        Priority: Priority.Low);

    [Fact]
    public async Task Valid_Request_Passes()
    {
        var result = await _validator.TestValidateAsync(Valid());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Completed_WithoutDescription_Fails()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = TaskStatus.Completed, Description = null });
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public async Task Completed_WithDescription_Passes()
    {
        var result = await _validator.TestValidateAsync(
            Valid() with { Status = TaskStatus.Completed, Description = "Done" });
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }
}
