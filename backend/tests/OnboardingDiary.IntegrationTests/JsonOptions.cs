using System.Text.Json;
using System.Text.Json.Serialization;

namespace OnboardingDiary.IntegrationTests;

public static class JsonOptions
{
    public static readonly JsonSerializerOptions Api = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}
