using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;

namespace OnboardingDiary.UnitTests;

public class IssueTransitionTests
{
    [Theory]
    [InlineData(IssueStatus.Open, IssueStatus.InProgress, true)]
    [InlineData(IssueStatus.Open, IssueStatus.Resolved, true)]
    [InlineData(IssueStatus.Open, IssueStatus.Closed, false)]
    [InlineData(IssueStatus.InProgress, IssueStatus.Open, true)]
    [InlineData(IssueStatus.InProgress, IssueStatus.Resolved, true)]
    [InlineData(IssueStatus.InProgress, IssueStatus.Closed, false)]
    [InlineData(IssueStatus.Resolved, IssueStatus.Closed, true)]
    [InlineData(IssueStatus.Resolved, IssueStatus.Open, true)]
    [InlineData(IssueStatus.Resolved, IssueStatus.InProgress, false)]
    [InlineData(IssueStatus.Closed, IssueStatus.Open, true)]
    [InlineData(IssueStatus.Closed, IssueStatus.Resolved, false)]
    [InlineData(IssueStatus.Closed, IssueStatus.InProgress, false)]
    public void The_transition_matrix_matches_the_agreed_workflow(
        IssueStatus from,
        IssueStatus to,
        bool allowed
    ) => Assert.Equal(allowed, IssueTransitions.CanMove(from, to));

    [Theory]
    [InlineData(IssueStatus.Open, false)]
    [InlineData(IssueStatus.InProgress, false)]
    [InlineData(IssueStatus.Resolved, true)]
    [InlineData(IssueStatus.Closed, true)]
    public void Resolution_notes_are_required_only_when_the_issue_stops_being_active(
        IssueStatus status,
        bool required
    ) => Assert.Equal(required, IssueTransitions.RequiresResolutionNotes(status));

    [Fact]
    public void A_status_can_always_stay_where_it_is()
    {
        foreach (var status in Enum.GetValues<IssueStatus>())
        {
            Assert.True(IssueTransitions.CanMove(status, status));
        }
    }
}

public class NoteTagTests
{
    [Fact]
    public void Tags_are_trimmed_lower_cased_and_de_duplicated()
    {
        var tags = NoteTags.Normalise(["Deploy", " deploy ", "RELEASE", "  ", "release"]);

        Assert.Equal(["deploy", "release"], tags);
    }

    [Fact]
    public void A_missing_tag_list_normalises_to_empty()
    {
        Assert.Empty(NoteTags.Normalise(null));
    }
}
