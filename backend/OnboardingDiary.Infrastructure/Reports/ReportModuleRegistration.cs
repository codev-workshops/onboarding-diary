using Microsoft.Extensions.DependencyInjection;
using OnboardingDiary.Application.Reports;
using QuestPDF.Infrastructure;

namespace OnboardingDiary.Infrastructure.Reports;

public static class ReportModuleRegistration
{
    public static IServiceCollection AddReportModule(this IServiceCollection services)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        services.AddScoped<IReportDataCollector, ReportDataCollector>();
        services.AddScoped<IReportRenderer, PdfReportRenderer>();
        services.AddScoped<IReportRenderer, CsvReportRenderer>();
        services.AddScoped<IReportFileStore, LocalReportFileStore>();
        services.AddScoped<IReportService, ReportService>();

        return services;
    }
}
