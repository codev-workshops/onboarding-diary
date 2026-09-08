using OnboardingDiary.Api.Features.Reports;

namespace OnboardingDiary.UnitTests;

public class ReportRulesTests
{
    private static ReportHeader Header(string name, DateOnly? from, DateOnly? to) =>
        new(1, name, "rae@example.com", "Engineering", null, from, to, DateTimeOffset.UtcNow);

    [Fact]
    public void Missing_sections_mean_every_section()
    {
        Assert.Equal(ReportRules.AllSections, ReportRules.ParseSections(null));
        Assert.Equal(ReportRules.AllSections, ReportRules.ParseSections([]));
        Assert.Equal(ReportRules.AllSections, ReportRules.ParseSections(["nonsense"]));
    }

    [Fact]
    public void Sections_are_parsed_case_insensitively_deduplicated_and_ordered()
    {
        Assert.Equal(
            [ReportSection.Tasks, ReportSection.Notes],
            ReportRules.ParseSections(["notes", "TASKS", "notes"])
        );
        Assert.Equal(
            [ReportSection.Issues, ReportSection.Feedback],
            ReportRules.ParseSections(["Issues,Feedback"])
        );
    }

    [Theory]
    [InlineData("Rae Recruit", "rae-recruit-2026-01-01-2026-01-31.csv")]
    [InlineData("Ada  O'Neill", "ada-o-neill-2026-01-01-2026-01-31.csv")]
    public void File_name_slugs_the_recruit_name_and_range(string fullName, string expected)
    {
        var header = Header(fullName, new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        Assert.Equal(expected, ReportRules.FileName(header, ReportFormat.Csv));
    }

    [Fact]
    public void File_name_describes_an_open_ended_or_missing_range()
    {
        Assert.Equal(
            "rae-all.pdf",
            ReportRules.FileName(Header("Rae", null, null), ReportFormat.Pdf)
        );
        Assert.Equal(
            "rae-from-2026-01-01.pdf",
            ReportRules.FileName(
                Header("Rae", new DateOnly(2026, 1, 1), null),
                ReportFormat.Pdf
            )
        );
        Assert.Equal(
            "rae-to-2026-01-31.pdf",
            ReportRules.FileName(Header("Rae", null, new DateOnly(2026, 1, 31)), ReportFormat.Pdf)
        );
    }

    [Theory]
    [InlineData(null, null, true)]
    [InlineData("2026-01-01", "2026-01-01", true)]
    [InlineData("2026-01-02", "2026-01-01", false)]
    [InlineData("2025-01-01", "2026-01-31", false)]
    public void Range_validation_rejects_inverted_and_oversized_ranges(
        string? from,
        string? to,
        bool expected
    )
    {
        var query = new ReportQuery(
            null,
            from is null ? null : DateOnly.Parse(from),
            to is null ? null : DateOnly.Parse(to),
            ReportRules.AllSections
        );

        Assert.Equal(expected, new ReportQueryValidator().Validate(query).IsValid);
    }
}
