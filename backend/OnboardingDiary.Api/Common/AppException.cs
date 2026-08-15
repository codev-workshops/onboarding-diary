namespace OnboardingDiary.Api.Common;

public class AppException : Exception
{
    public AppException(int statusCode, string code, string message, IReadOnlyList<string>? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
        Details = details ?? Array.Empty<string>();
    }

    public int StatusCode { get; }

    public string Code { get; }

    public IReadOnlyList<string> Details { get; }

    public static AppException NotFound(string message = "The requested resource was not found.") =>
        new(404, "not_found", message);

    public static AppException Forbidden(string message = "You are not allowed to access this resource.") =>
        new(403, "forbidden", message);

    public static AppException Unauthorized(string message = "Authentication is required.") =>
        new(401, "unauthorized", message);

    public static AppException Conflict(string message) => new(409, "conflict", message);

    public static AppException Validation(string message, IReadOnlyList<string>? details = null) =>
        new(400, "validation_error", message, details);
}
