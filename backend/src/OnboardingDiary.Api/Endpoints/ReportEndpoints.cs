using System.Security.Claims;
using FluentValidation;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Reports;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class ReportEndpoints
{
    public static void MapReportEndpoints(this IEndpointRouteBuilder routes)
    {
        var reports = routes
            .MapGroup("/api/v1/reports")
            .RequireAuthorization()
            .WithTags("Reports");

        reports
            .MapGet(
                "/preview",
                async (
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    ReportService service,
                    IValidator<ReportQuery> validator,
                    CancellationToken ct,
                    int? userId = null,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    string[]? sections = null
                ) =>
                {
                    var (result, report) = await BuildAsync(
                        principal,
                        scope,
                        service,
                        validator,
                        new ReportQuery(userId, from, to, ReportRules.ParseSections(sections)),
                        ct
                    );

                    return result ?? Results.Ok(report);
                }
            )
            .ProducesValidationProblem()
            .WithName("PreviewReport");

        reports
            .MapGet(
                "/download",
                async (
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    ReportService service,
                    IValidator<ReportQuery> validator,
                    CancellationToken ct,
                    ReportFormat format = ReportFormat.Csv,
                    int? userId = null,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    string[]? sections = null
                ) =>
                {
                    var (failure, report) = await BuildAsync(
                        principal,
                        scope,
                        service,
                        validator,
                        new ReportQuery(userId, from, to, ReportRules.ParseSections(sections)),
                        ct
                    );

                    if (failure is not null)
                    {
                        return failure;
                    }

                    var (bytes, contentType) =
                        format == ReportFormat.Pdf
                            ? (ReportPdf.Render(report!), ReportPdf.ContentType)
                            : (ReportCsv.Render(report!), ReportCsv.ContentType);

                    return Results.File(
                        bytes,
                        contentType,
                        ReportRules.FileName(report!.Header, format)
                    );
                }
            )
            .ProducesValidationProblem()
            .WithName("DownloadReport");
    }

    /// <summary>
    /// Shared pipeline for both endpoints: authenticate, validate the range, resolve scope, build.
    /// Returns either a failure result or the report, never both.
    /// </summary>
    private static async Task<(IResult? Failure, ReportResponse? Report)> BuildAsync(
        ClaimsPrincipal principal,
        EntryScopeService scope,
        ReportService service,
        IValidator<ReportQuery> validator,
        ReportQuery query,
        CancellationToken ct
    )
    {
        if (principal.Caller() is not { } caller)
        {
            return (Results.Unauthorized(), null);
        }

        var validation = await validator.ValidateAsync(query, ct);
        if (!validation.IsValid)
        {
            return (
                Results.ValidationProblem(
                    validation
                        .Errors.GroupBy(failure => failure.PropertyName)
                        .ToDictionary(
                            group => group.Key,
                            group => group.Select(failure => failure.ErrorMessage).ToArray()
                        )
                ),
                null
            );
        }

        var (access, scopedUserId) = await scope.ResolveAsync(caller, query.UserId, ct);
        if (access == EntryAccess.Denied)
        {
            return (Results.NotFound(), null);
        }

        var report = await service.BuildAsync(scopedUserId, query, ct);
        return report is null ? (Results.NotFound(), null) : (null, report);
    }
}
