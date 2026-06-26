namespace OnboardingDiary.Application.Common;

public static class PaginationParams
{
    public const int DefaultLimit = 20;
    public const int MaxLimit = 100;
    public const int MinPage = 1;

    public static (int Page, int Limit) Normalize(int page, int limit)
    {
        page = Math.Max(MinPage, page);
        limit = limit < 1 ? DefaultLimit : Math.Min(limit, MaxLimit);
        return (page, limit);
    }
}
