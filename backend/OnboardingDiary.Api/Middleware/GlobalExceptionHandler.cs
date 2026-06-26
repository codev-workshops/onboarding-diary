using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using OnboardingDiary.Application.Common.Exceptions;
using ValidationException = OnboardingDiary.Application.Common.Exceptions.ValidationException;

namespace OnboardingDiary.Api.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, problemDetails) = exception switch
        {
            ValidationException ve => (StatusCodes.Status400BadRequest, CreateValidationProblem(ve)),
            FluentValidation.ValidationException fve => (StatusCodes.Status400BadRequest, CreateFluentValidationProblem(fve)),
            NotFoundException => (StatusCodes.Status404NotFound, CreateProblem(StatusCodes.Status404NotFound, exception.Message)),
            ForbiddenException => (StatusCodes.Status403Forbidden, CreateProblem(StatusCodes.Status403Forbidden, exception.Message)),
            ConflictException => (StatusCodes.Status409Conflict, CreateProblem(StatusCodes.Status409Conflict, exception.Message)),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, CreateProblem(StatusCodes.Status401Unauthorized, exception.Message)),
            KeyNotFoundException => (StatusCodes.Status404NotFound, CreateProblem(StatusCodes.Status404NotFound, exception.Message)),
            InvalidOperationException => (StatusCodes.Status400BadRequest, CreateProblem(StatusCodes.Status400BadRequest, exception.Message)),
            _ => (StatusCodes.Status500InternalServerError, CreateServerError(exception))
        };

        if (statusCode >= 500)
        {
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }

    private ProblemDetails CreateProblem(int statusCode, string detail)
    {
        return new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(statusCode),
            Detail = detail,
            Type = GetType(statusCode)
        };
    }

    private ProblemDetails CreateValidationProblem(ValidationException ex)
    {
        return new ValidationProblemDetails(ex.Errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation Failed",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
        };
    }

    private ProblemDetails CreateFluentValidationProblem(FluentValidation.ValidationException ex)
    {
        var errors = ex.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        return new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation Failed",
            Detail = "One or more validation errors occurred.",
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
        };
    }

    private ProblemDetails CreateServerError(Exception ex)
    {
        var detail = _env.IsDevelopment()
            ? ex.Message
            : "An unexpected error occurred. Please try again later.";

        return new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Internal Server Error",
            Detail = detail,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1"
        };
    }

    private static string GetTitle(int statusCode) => statusCode switch
    {
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        409 => "Conflict",
        429 => "Too Many Requests",
        _ => "Error"
    };

    private static string GetType(int statusCode) => statusCode switch
    {
        400 => "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        401 => "https://tools.ietf.org/html/rfc7231#section-6.5.2",
        403 => "https://tools.ietf.org/html/rfc7231#section-6.5.3",
        404 => "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        409 => "https://tools.ietf.org/html/rfc7231#section-6.5.8",
        429 => "https://tools.ietf.org/html/rfc6585#section-4",
        _ => "https://tools.ietf.org/html/rfc7231#section-6.6.1"
    };
}
