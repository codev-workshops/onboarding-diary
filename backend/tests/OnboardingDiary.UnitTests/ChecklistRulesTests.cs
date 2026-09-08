using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Checklists;

namespace OnboardingDiary.UnitTests;

public class ChecklistRulesTests
{
    private static readonly DateOnly Today = new(2026, 3, 10);

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(4, 0, 0)]
    [InlineData(4, 1, 25)]
    [InlineData(3, 2, 67)]
    [InlineData(4, 4, 100)]
    public void Completion_percentage_rounds_the_share_of_done_tasks(
        int generated,
        int completed,
        int expected
    ) => Assert.Equal(expected, ChecklistRules.CompletionPercentage(generated, completed));

    [Fact]
    public void Completion_percentage_is_zero_rather_than_full_when_every_task_was_deleted() =>
        Assert.Equal(0, ChecklistRules.CompletionPercentage(0, 0));

    [Fact]
    public void Entry_date_counts_the_offset_from_the_start_date()
    {
        var start = Today.AddDays(-10);

        Assert.Equal(start, ChecklistRules.ResolveEntryDate(start, Today, null));
        Assert.Equal(start, ChecklistRules.ResolveEntryDate(start, Today, 0));
        Assert.Equal(start.AddDays(3), ChecklistRules.ResolveEntryDate(start, Today, 3));
    }

    [Fact]
    public void Entry_date_falls_back_to_today_when_the_recruit_has_no_start_date() =>
        Assert.Equal(Today, ChecklistRules.ResolveEntryDate(null, Today, 5));

    /// <summary>Tasks reject future entry dates, so an offset beyond today lands on today.</summary>
    [Fact]
    public void Entry_date_never_lands_in_the_future() =>
        Assert.Equal(Today, ChecklistRules.ResolveEntryDate(Today.AddDays(-1), Today, 30));

    [Fact]
    public void A_template_needs_a_name_and_at_least_one_item()
    {
        var validator = new SaveChecklistTemplateRequestValidator();

        var empty = validator.Validate(
            new SaveChecklistTemplateRequest("", null, null, true, [])
        );
        Assert.False(empty.IsValid);
        Assert.Contains(empty.Errors, e => e.PropertyName == "Name");
        Assert.Contains(empty.Errors, e => e.PropertyName == "Items");

        var valid = validator.Validate(
            new SaveChecklistTemplateRequest(
                "Engineering week one",
                null,
                null,
                true,
                [new ChecklistItemRequest("Collect the laptop", null, TaskCategory.Setup, 0)]
            )
        );
        Assert.True(valid.IsValid);
    }

    [Fact]
    public void An_item_due_offset_stays_within_a_year()
    {
        var validator = new ChecklistItemRequestValidator();

        Assert.False(
            validator
                .Validate(new ChecklistItemRequest("Collect the laptop", null, TaskCategory.Setup, -1))
                .IsValid
        );
        Assert.False(
            validator
                .Validate(
                    new ChecklistItemRequest(
                        "Collect the laptop",
                        null,
                        TaskCategory.Setup,
                        ChecklistRules.MaxDueOffsetDays + 1
                    )
                )
                .IsValid
        );
        Assert.True(
            validator
                .Validate(
                    new ChecklistItemRequest(
                        "Collect the laptop",
                        null,
                        TaskCategory.Setup,
                        ChecklistRules.MaxDueOffsetDays
                    )
                )
                .IsValid
        );
    }

    [Fact]
    public void A_template_cannot_carry_more_items_than_the_limit()
    {
        var items = Enumerable
            .Range(0, ChecklistRules.MaxItemsPerTemplate + 1)
            .Select(i => new ChecklistItemRequest($"Item {i}", null, TaskCategory.Other, 0))
            .ToList();

        var result = new SaveChecklistTemplateRequestValidator().Validate(
            new SaveChecklistTemplateRequest("Too long", null, null, true, items)
        );

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "Items");
    }
}
