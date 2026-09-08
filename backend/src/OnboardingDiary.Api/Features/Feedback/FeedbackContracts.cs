using FluentValidation;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Feedback;

public record CreateFeedbackRequest(
    DateOnly EntryDate,
    string Title,
    string Message,
    FeedbackType Type
);

public record UpdateFeedbackRequest(
    DateOnly EntryDate,
    string Title,
    string Message,
    FeedbackType Type
);

public record FeedbackResponse(
    int Id,
    int UserId,
    DateOnly EntryDate,
    string Title,
    string Message,
    FeedbackType Type,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
)
{
    public static FeedbackResponse From(FeedbackEntry feedback) =>
        new(
            feedback.Id,
            feedback.UserId,
            feedback.EntryDate,
            feedback.Title,
            feedback.Message,
            feedback.Type,
            feedback.CreatedAt,
            feedback.UpdatedAt
        );
}

public record FeedbackListQuery(
    DateOnly? From,
    DateOnly? To,
    FeedbackType? Type,
    string? Q,
    int? UserId,
    int Page = 1,
    int PageSize = 20
);

public class CreateFeedbackRequestValidator : AbstractValidator<CreateFeedbackRequest>
{
    public CreateFeedbackRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Message).NotEmpty().MinimumLength(3).MaximumLength(5000);
        RuleFor(r => r.Type).IsInEnum();
    }
}

public class UpdateFeedbackRequestValidator : AbstractValidator<UpdateFeedbackRequest>
{
    public UpdateFeedbackRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Message).NotEmpty().MinimumLength(3).MaximumLength(5000);
        RuleFor(r => r.Type).IsInEnum();
    }
}
