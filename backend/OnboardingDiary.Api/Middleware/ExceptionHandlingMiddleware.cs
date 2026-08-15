using System.Text.Json;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "Handled application error {Code}", ex.Code);
            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message, ex.Details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteAsync(context, 500, "internal_error", "An unexpected error occurred.", Array.Empty<string>());
        }
    }

    private static async Task WriteAsync(
        HttpContext context,
        int statusCode,
        string code,
        string message,
        IReadOnlyList<string> details)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = new ErrorResponse
        {
            Error = new ErrorBody { Code = code, Message = message, Details = details }
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, SerializerOptions));
    }
}
