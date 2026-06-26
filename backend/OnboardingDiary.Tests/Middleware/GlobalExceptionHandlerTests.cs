using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.FileProviders;
using OnboardingDiary.Api.Middleware;
using OnboardingDiary.Application.Common.Exceptions;

namespace OnboardingDiary.Tests.Middleware;

public class GlobalExceptionHandlerTests
{
    private readonly GlobalExceptionHandler _handler;
    private readonly TestLogger _logger;

    public GlobalExceptionHandlerTests()
    {
        _logger = new TestLogger();
        _handler = new GlobalExceptionHandler(_logger, new TestHostEnvironment("Production"));
    }

    private static HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<ProblemDetails> ReadProblemDetails(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        return (await JsonSerializer.DeserializeAsync<ProblemDetails>(
            context.Response.Body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }))!;
    }

    [Fact]
    public async Task NotFoundException_Returns404()
    {
        var context = CreateContext();
        var ex = new NotFoundException("Item not found");

        var handled = await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(404, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(404, problem.Status);
        Assert.Equal("Item not found", problem.Detail);
    }

    [Fact]
    public async Task ForbiddenException_Returns403()
    {
        var context = CreateContext();
        var ex = new ForbiddenException("Access denied");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(403, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(403, problem.Status);
    }

    [Fact]
    public async Task ConflictException_Returns409()
    {
        var context = CreateContext();
        var ex = new ConflictException("Duplicate email");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(409, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(409, problem.Status);
    }

    [Fact]
    public async Task UnauthorizedAccessException_Returns401()
    {
        var context = CreateContext();
        var ex = new UnauthorizedAccessException("Not authenticated");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(401, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(401, problem.Status);
    }

    [Fact]
    public async Task ValidationException_Returns400WithErrors()
    {
        var context = CreateContext();
        var errors = new Dictionary<string, string[]>
        {
            { "Title", new[] { "Title is required" } }
        };
        var ex = new ValidationException(errors);

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(400, context.Response.StatusCode);
    }

    [Fact]
    public async Task UnhandledException_Returns500_NoStackTraceInProduction()
    {
        var context = CreateContext();
        var ex = new Exception("Something broke");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(500, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(500, problem.Status);
        Assert.Equal("An unexpected error occurred. Please try again later.", problem.Detail);
        Assert.DoesNotContain("Something broke", problem.Detail!);
    }

    [Fact]
    public async Task UnhandledException_LogsError()
    {
        var context = CreateContext();
        var ex = new Exception("Boom");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.True(_logger.ErrorLogged);
    }

    [Fact]
    public async Task KeyNotFoundException_Returns404()
    {
        var context = CreateContext();
        var ex = new KeyNotFoundException("User not found.");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(404, context.Response.StatusCode);
    }

    [Fact]
    public async Task FileNotFoundException_Returns404()
    {
        var context = CreateContext();
        var ex = new FileNotFoundException("Report file not found.");

        await _handler.TryHandleAsync(context, ex, CancellationToken.None);

        Assert.Equal(404, context.Response.StatusCode);
        var problem = await ReadProblemDetails(context);
        Assert.Equal(404, problem.Status);
    }

    private class TestLogger : ILogger<GlobalExceptionHandler>
    {
        public bool ErrorLogged { get; private set; }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Error) ErrorLogged = true;
        }
    }

    private class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName) => EnvironmentName = environmentName;
        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
