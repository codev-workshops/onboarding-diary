namespace OnboardingDiary.Api.Common;

public static class DateRange
{
    /// <summary>Normalises a date to UTC midnight so that date-only values compare consistently.</summary>
    public static DateTime ToUtcDate(this DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);
}
