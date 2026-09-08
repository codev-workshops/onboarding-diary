namespace OnboardingDiary.Api.Domain;

public enum TaskCategory
{
    Training,
    Setup,
    Meeting,
    Documentation,
    Coding,
    Shadowing,
    Other,
}

public enum TaskEntryStatus
{
    Todo,
    InProgress,
    Blocked,
    Done,
}

public enum TaskPriority
{
    Low,
    Medium,
    High,
}
