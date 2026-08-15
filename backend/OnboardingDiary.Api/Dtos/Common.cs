namespace OnboardingDiary.Api.Dtos;

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();

    public int Page { get; init; }

    public int PageSize { get; init; }

    public int Total { get; init; }
}

public class PagedQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public int? RecruitId { get; set; }

    public DateTime? From { get; set; }

    public DateTime? To { get; set; }

    public string? Search { get; set; }
}

public class ErrorResponse
{
    public ErrorBody Error { get; init; } = new();
}

public class ErrorBody
{
    public string Code { get; init; } = "internal_error";

    public string Message { get; init; } = "An unexpected error occurred.";

    public IReadOnlyList<string> Details { get; init; } = Array.Empty<string>();
}
