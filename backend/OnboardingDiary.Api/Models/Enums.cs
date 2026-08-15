namespace OnboardingDiary.Api.Models;

public enum UserRole
{
    NewRecruit = 0,
    Manager = 1,
    Admin = 2
}

public enum TaskCategory
{
    Training = 0,
    Setup = 1,
    Documentation = 2,
    Meeting = 3,
    Development = 4,
    Other = 5
}

public enum TaskEntryStatus
{
    NotStarted = 0,
    InProgress = 1,
    Blocked = 2,
    Completed = 3
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

public enum IssueSeverity
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum IssueStatus
{
    Open = 0,
    InProgress = 1,
    Resolved = 2,
    Closed = 3
}

public enum FeedbackType
{
    Positive = 0,
    Suggestion = 1,
    Concern = 2
}
