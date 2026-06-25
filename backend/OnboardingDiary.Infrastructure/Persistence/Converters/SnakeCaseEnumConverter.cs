using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace OnboardingDiary.Infrastructure.Persistence.Converters;

public partial class SnakeCaseEnumConverter<TEnum> : ValueConverter<TEnum, string>
    where TEnum : struct, Enum
{
    public SnakeCaseEnumConverter()
        : base(
            v => ToSnakeCase(v.ToString()),
            v => FromSnakeCase(v))
    {
    }

    private static string ToSnakeCase(string value)
    {
        return SplitRegex().Replace(value, "_$1").ToLowerInvariant();
    }

    private static TEnum FromSnakeCase(string value)
    {
        foreach (var enumValue in Enum.GetValues<TEnum>())
        {
            if (ToSnakeCase(enumValue.ToString()) == value)
                return enumValue;
        }

        throw new InvalidOperationException($"Unknown enum value '{value}' for type {typeof(TEnum).Name}");
    }

    [GeneratedRegex("(?<!^)([A-Z])")]
    private static partial Regex SplitRegex();
}
