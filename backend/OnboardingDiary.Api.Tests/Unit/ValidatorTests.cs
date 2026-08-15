using FluentAssertions;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;
using OnboardingDiary.Api.Validation;

namespace OnboardingDiary.Api.Tests.Unit;

public class ValidatorTests
{
    private static SaveTaskRequest ValidTask() => new()
    {
        Date = DateTime.UtcNow.Date,
        Title = "Complete security training",
        Description = "Finish the mandatory modules.",
        Category = TaskCategory.Training,
        Status = TaskEntryStatus.InProgress,
        Priority = TaskPriority.High
    };

    [Fact]
    public void SaveTaskRequest_IsValidForAWellFormedRequest()
    {
        new SaveTaskRequestValidator().Validate(ValidTask()).IsValid.Should().BeTrue();
    }

    [Fact]
    public void SaveTaskRequest_RejectsAnEmptyTitle()
    {
        var request = ValidTask();
        request.Title = "   ";

        var result = new SaveTaskRequestValidator().Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == nameof(SaveTaskRequest.Title));
    }

    [Fact]
    public void SaveTaskRequest_RejectsATitleLongerThan200Characters()
    {
        var request = ValidTask();
        request.Title = new string('a', 201);

        new SaveTaskRequestValidator().Validate(request).IsValid.Should().BeFalse();
    }

    [Fact]
    public void SaveTaskRequest_RejectsFarFutureDates()
    {
        var request = ValidTask();
        request.Date = DateTime.UtcNow.AddYears(2);

        new SaveTaskRequestValidator().Validate(request).IsValid.Should().BeFalse();
    }

    [Fact]
    public void SaveNoteRequest_RejectsMoreThanTenTags()
    {
        var request = new SaveNoteRequest
        {
            Date = DateTime.UtcNow.Date,
            Title = "Retro",
            Content = "Notes",
            Tags = Enumerable.Range(0, 11).Select(index => $"tag{index}").ToList()
        };

        new SaveNoteRequestValidator().Validate(request).IsValid.Should().BeFalse();
    }

    [Fact]
    public void ReportQuery_RejectsAnInvertedDateRange()
    {
        var query = new ReportQuery
        {
            Type = ReportType.Tasks,
            Format = ReportFormat.Csv,
            From = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
            To = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        new ReportQueryValidator().Validate(query).IsValid.Should().BeFalse();
    }

    [Fact]
    public void SignupRequest_RejectsShortPasswordsAndInvalidEmails()
    {
        var result = new SignupRequestValidator().Validate(new SignupRequest
        {
            Email = "not-an-email",
            Password = "short",
            FullName = string.Empty
        });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCountGreaterThanOrEqualTo(3);
    }
}
