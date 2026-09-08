namespace OnboardingDiary.Api.Domain;

public enum IssueSeverity
{
    Low,
    Medium,
    High,
    Critical,
}

public enum IssueStatus
{
    Open,
    InProgress,
    Resolved,
    Closed,
}

public enum FeedbackType
{
    Positive,
    Suggestion,
    Concern,
    Question,
}
