using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Checklists;
using OnboardingDiary.Api.Features.Dashboard;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.IntegrationTests;

public class ChecklistEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "correct-horse-9";

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private static int _seed;

    private static string Unique(string prefix) =>
        $"{prefix}-{Interlocked.Increment(ref _seed)}-{Guid.NewGuid():N}";

    private async Task<(HttpClient Client, int UserId)> RecruitAsync(int? departmentId = null)
    {
        var email = $"{Unique("checklist-recruit")}@example.com";
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/signup",
            new SignupRequest(email, Password, "Checklist Recruit", departmentId, Today.AddDays(-10))
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        return (Authorized(client, auth.AccessToken), auth.User.Id);
    }

    private async Task<(HttpClient Client, int UserId)> PromotedAsync(UserRole role)
    {
        var email = $"{Unique("checklist-staff")}@example.com";
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/signup",
            new SignupRequest(email, Password, $"Checklist {role}", null, Today.AddDays(-30))
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        var userId = auth.User.Id;

        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Role = role;
            return await db.SaveChangesAsync();
        });

        var login = await factory.CreateClient().PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, Password)
        );
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var reauth = (await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;

        return (Authorized(factory.CreateClient(), reauth.AccessToken), userId);
    }

    private static HttpClient Authorized(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private Task AssignAsync(int recruitId, int managerId) =>
        factory.WithDbAsync(async db =>
        {
            var recruit = await db.Users.FirstAsync(u => u.Id == recruitId);
            recruit.ManagerId = managerId;
            return await db.SaveChangesAsync();
        });

    private Task<int> DepartmentIdAsync() =>
        factory.WithDbAsync(async db => (await db.Departments.FirstAsync()).Id);

    private static SaveChecklistTemplateRequest TemplateRequest(
        string name,
        int? departmentId = null,
        bool isActive = true,
        IReadOnlyList<ChecklistItemRequest>? items = null
    ) =>
        new(
            name,
            "Everything a new joiner does in week one.",
            departmentId,
            isActive,
            items
                ?? [
                    new ChecklistItemRequest(
                        "Collect the laptop",
                        "Pick it up from IT.",
                        TaskCategory.Setup,
                        0
                    ),
                    new ChecklistItemRequest("Meet the buddy", null, TaskCategory.Meeting, 1),
                    new ChecklistItemRequest("Read the handbook", null, TaskCategory.Training, 2),
                ]
        );

    private static async Task<ChecklistTemplateResponse> CreateTemplateAsync(
        HttpClient admin,
        SaveChecklistTemplateRequest request
    )
    {
        var response = await admin.PostAsJsonAsync("/api/v1/checklist-templates", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ChecklistTemplateResponse>(JsonOptions.Api))!;
    }

    private static async Task<ApplyChecklistResponse> ApplyAsync(HttpClient recruit, int templateId)
    {
        var response = await recruit.PostAsJsonAsync(
            "/api/v1/checklists/apply",
            new ApplyChecklistRequest(templateId)
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ApplyChecklistResponse>(JsonOptions.Api))!;
    }

    private static Task<IReadOnlyList<ChecklistProgressResponse>?> ProgressAsync(
        HttpClient client,
        int? userId = null
    ) =>
        client.GetFromJsonAsync<IReadOnlyList<ChecklistProgressResponse>>(
            userId is null ? "/api/v1/checklists/progress" : $"/api/v1/checklists/progress?userId={userId}",
            JsonOptions.Api
        );

    [Fact]
    public async Task Admin_creates_a_template_whose_items_keep_the_submitted_order()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);

        var created = await CreateTemplateAsync(admin, TemplateRequest(Unique("Ordered template")));

        Assert.Equal([0, 1, 2], created.Items.Select(i => i.Position));
        Assert.Equal(
            ["Collect the laptop", "Meet the buddy", "Read the handbook"],
            created.Items.Select(i => i.Title)
        );

        var fetched = (
            await admin.GetFromJsonAsync<ChecklistTemplateResponse>(
                $"/api/v1/checklist-templates/{created.Id}",
                JsonOptions.Api
            )
        )!;

        Assert.Equal(created.Items.Select(i => i.Title), fetched.Items.Select(i => i.Title));
        Assert.Equal(3, fetched.ItemCount);
    }

    [Fact]
    public async Task Template_names_are_unique_and_a_collision_conflicts()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var name = Unique("Duplicate template");

        await CreateTemplateAsync(admin, TemplateRequest(name));
        var again = await admin.PostAsJsonAsync("/api/v1/checklist-templates", TemplateRequest(name));

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
    }

    [Fact]
    public async Task A_template_without_items_is_rejected()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);

        var response = await admin.PostAsJsonAsync(
            "/api/v1/checklist-templates",
            TemplateRequest(Unique("Empty template"), items: [])
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Recruits_and_managers_cannot_write_templates_and_anonymous_callers_cannot_read_them()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Guarded template")));
        var (recruit, _) = await RecruitAsync();
        var (manager, _) = await PromotedAsync(UserRole.Manager);

        var recruitCreate = await recruit.PostAsJsonAsync(
            "/api/v1/checklist-templates",
            TemplateRequest(Unique("Recruit template"))
        );
        Assert.Equal(HttpStatusCode.Forbidden, recruitCreate.StatusCode);

        var recruitList = await recruit.GetAsync("/api/v1/checklist-templates");
        Assert.Equal(HttpStatusCode.Forbidden, recruitList.StatusCode);

        var managerCreate = await manager.PostAsJsonAsync(
            "/api/v1/checklist-templates",
            TemplateRequest(Unique("Manager template"))
        );
        Assert.Equal(HttpStatusCode.Forbidden, managerCreate.StatusCode);

        var managerEdit = await manager.PutAsJsonAsync(
            $"/api/v1/checklist-templates/{template.Id}",
            TemplateRequest(template.Name)
        );
        Assert.Equal(HttpStatusCode.Forbidden, managerEdit.StatusCode);

        var managerDelete = await manager.DeleteAsync($"/api/v1/checklist-templates/{template.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, managerDelete.StatusCode);

        var managerRead = await manager.GetAsync($"/api/v1/checklist-templates/{template.Id}");
        Assert.Equal(HttpStatusCode.OK, managerRead.StatusCode);

        var anonymous = await factory.CreateClient().GetAsync("/api/v1/checklist-templates");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task Managers_and_admins_cannot_apply_a_template()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Applied by staff")));
        var (manager, _) = await PromotedAsync(UserRole.Manager);

        foreach (var client in new[] { manager, admin })
        {
            var response = await client.PostAsJsonAsync(
                "/api/v1/checklists/apply",
                new ApplyChecklistRequest(template.Id)
            );
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task Recruit_only_sees_active_templates_for_their_own_department()
    {
        var departmentId = await DepartmentIdAsync();
        var (admin, _) = await PromotedAsync(UserRole.Admin);

        var everyone = await CreateTemplateAsync(admin, TemplateRequest(Unique("All departments")));
        var mine = await CreateTemplateAsync(
            admin,
            TemplateRequest(Unique("My department"), departmentId)
        );
        var retired = await CreateTemplateAsync(
            admin,
            TemplateRequest(Unique("Retired"), isActive: false)
        );
        var otherDepartmentId = await factory.WithDbAsync(async db =>
        {
            var department = new Department { Name = Unique("Other department"), IsActive = true };
            db.Departments.Add(department);
            await db.SaveChangesAsync();
            return department.Id;
        });
        var other = await CreateTemplateAsync(
            admin,
            TemplateRequest(Unique("Other department template"), otherDepartmentId)
        );

        var (recruit, _) = await RecruitAsync(departmentId);
        var available = (
            await recruit.GetFromJsonAsync<IReadOnlyList<AvailableChecklistResponse>>(
                "/api/v1/checklist-templates/available",
                JsonOptions.Api
            )
        )!;

        var ids = available.Select(a => a.TemplateId).ToList();
        Assert.Contains(everyone.Id, ids);
        Assert.Contains(mine.Id, ids);
        Assert.DoesNotContain(retired.Id, ids);
        Assert.DoesNotContain(other.Id, ids);
        Assert.All(available, a => Assert.False(a.Applied));

        var forbidden = await recruit.PostAsJsonAsync(
            "/api/v1/checklists/apply",
            new ApplyChecklistRequest(other.Id)
        );
        Assert.Equal(HttpStatusCode.NotFound, forbidden.StatusCode);
    }

    [Fact]
    public async Task Applying_a_template_snapshots_its_items_into_ordinary_tasks()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Snapshot into tasks")));
        var (recruit, recruitId) = await RecruitAsync();
        var startDate = Today.AddDays(-10);

        var applied = await ApplyAsync(recruit, template.Id);

        Assert.Equal(3, applied.Tasks.Count);
        Assert.Equal(3, applied.Progress.GeneratedTasks);
        Assert.Equal(0, applied.Progress.CompletionPercentage);
        Assert.All(applied.Tasks, t => Assert.Equal(recruitId, t.UserId));
        Assert.All(
            applied.Tasks,
            t => Assert.Equal(applied.Progress.AssignmentId, t.ChecklistAssignmentId)
        );

        var laptop = applied.Tasks.Single(t => t.Title == "Collect the laptop");
        Assert.Equal("Pick it up from IT.", laptop.Description);
        Assert.Equal(TaskCategory.Setup, laptop.Category);
        Assert.Equal(TaskEntryStatus.Todo, laptop.Status);
        Assert.Equal(startDate, laptop.EntryDate);
        Assert.Equal(startDate.AddDays(1), applied.Tasks.Single(t => t.Title == "Meet the buddy").EntryDate);

        // They are ordinary tasks: the recruit's own task list returns them.
        var tasks = (
            await recruit.GetFromJsonAsync<PagedResponse<TaskResponse>>(
                "/api/v1/tasks?pageSize=50",
                JsonOptions.Api
            )
        )!;
        Assert.Equal(3, tasks.Total);
    }

    [Fact]
    public async Task The_same_template_cannot_be_applied_twice_even_after_the_tasks_are_deleted()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Applied once")));
        var (recruit, recruitId) = await RecruitAsync();

        var applied = await ApplyAsync(recruit, template.Id);

        var duplicate = await recruit.PostAsJsonAsync(
            "/api/v1/checklists/apply",
            new ApplyChecklistRequest(template.Id)
        );
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        foreach (var task in applied.Tasks)
        {
            var deleted = await recruit.DeleteAsync($"/api/v1/tasks/{task.Id}");
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        }

        var afterDeletion = await recruit.PostAsJsonAsync(
            "/api/v1/checklists/apply",
            new ApplyChecklistRequest(template.Id)
        );
        Assert.Equal(HttpStatusCode.Conflict, afterDeletion.StatusCode);

        // The assignment survives its tasks and reports zero rather than a misleading 100%.
        var progress = Assert.Single((await ProgressAsync(recruit))!);
        Assert.Equal(applied.Progress.AssignmentId, progress.AssignmentId);
        Assert.Equal(0, progress.GeneratedTasks);
        Assert.Equal(0, progress.CompletionPercentage);

        var assignments = await factory.WithDbAsync(db =>
            db.ChecklistAssignments.CountAsync(a => a.UserId == recruitId)
        );
        Assert.Equal(1, assignments);
    }

    [Fact]
    public async Task A_recruit_can_apply_several_different_templates()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var first = await CreateTemplateAsync(admin, TemplateRequest(Unique("First template")));
        var second = await CreateTemplateAsync(
            admin,
            TemplateRequest(
                Unique("Second template"),
                items: [new ChecklistItemRequest("Book the security briefing", null, TaskCategory.Meeting, 0)]
            )
        );
        var (recruit, _) = await RecruitAsync();

        await ApplyAsync(recruit, first.Id);
        await ApplyAsync(recruit, second.Id);

        var progress = (await ProgressAsync(recruit))!;
        Assert.Equal(2, progress.Count);
        Assert.Equal([3, 1], progress.OrderBy(p => p.AssignmentId).Select(p => p.GeneratedTasks));
    }

    [Fact]
    public async Task Editing_a_template_after_it_was_applied_leaves_the_generated_tasks_alone()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Edited later")));
        var (recruit, _) = await RecruitAsync();

        var applied = await ApplyAsync(recruit, template.Id);

        var edit = await admin.PutAsJsonAsync(
            $"/api/v1/checklist-templates/{template.Id}",
            TemplateRequest(
                template.Name,
                items: [new ChecklistItemRequest("Something else entirely", null, TaskCategory.Other, 0)]
            )
        );
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);

        var tasks = (
            await recruit.GetFromJsonAsync<PagedResponse<TaskResponse>>(
                "/api/v1/tasks?pageSize=50",
                JsonOptions.Api
            )
        )!;
        Assert.Equal(3, tasks.Total);
        Assert.Contains(tasks.Items, t => t.Title == "Collect the laptop");
        Assert.DoesNotContain(tasks.Items, t => t.Title == "Something else entirely");

        // Progress still counts the generated tasks, not the template's single current item.
        var progress = Assert.Single((await ProgressAsync(recruit))!);
        Assert.Equal(applied.Progress.AssignmentId, progress.AssignmentId);
        Assert.Equal(3, progress.GeneratedTasks);
    }

    [Fact]
    public async Task Completion_percentage_follows_the_status_of_the_generated_tasks()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Completion tracked")));
        var (recruit, _) = await RecruitAsync();

        var applied = await ApplyAsync(recruit, template.Id);

        async Task CompleteAsync(TaskResponse task)
        {
            var response = await recruit.PatchAsJsonAsync(
                $"/api/v1/tasks/{task.Id}",
                new UpdateTaskRequest(
                    task.EntryDate,
                    task.Title,
                    task.Description,
                    task.Category,
                    TaskEntryStatus.Done,
                    task.Priority
                )
            );
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        await CompleteAsync(applied.Tasks[0]);
        var partial = Assert.Single((await ProgressAsync(recruit))!);
        Assert.Equal(1, partial.CompletedTasks);
        Assert.Equal(33, partial.CompletionPercentage);

        await CompleteAsync(applied.Tasks[1]);
        await CompleteAsync(applied.Tasks[2]);
        var full = Assert.Single((await ProgressAsync(recruit))!);
        Assert.Equal(3, full.CompletedTasks);
        Assert.Equal(100, full.CompletionPercentage);

        var dashboard = (
            await recruit.GetFromJsonAsync<DashboardResponse>("/api/v1/dashboard", JsonOptions.Api)
        )!;
        var block = Assert.Single(dashboard.Checklists);
        Assert.Equal(applied.Progress.AssignmentId, block.AssignmentId);
        Assert.Equal(100, block.CompletionPercentage);

        var detail = (
            await recruit.GetFromJsonAsync<ChecklistAssignmentDetailResponse>(
                $"/api/v1/checklists/{applied.Progress.AssignmentId}",
                JsonOptions.Api
            )
        )!;
        Assert.Equal(3, detail.Tasks.Count);
        Assert.All(detail.Tasks, t => Assert.Equal(TaskEntryStatus.Done, t.Status));
    }

    [Fact]
    public async Task Progress_is_visible_to_the_recruit_their_manager_and_an_admin_but_nobody_else()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var template = await CreateTemplateAsync(admin, TemplateRequest(Unique("Scoped progress")));
        var (recruit, recruitId) = await RecruitAsync();
        var (other, _) = await RecruitAsync();
        var (manager, managerId) = await PromotedAsync(UserRole.Manager);
        var (stranger, _) = await PromotedAsync(UserRole.Manager);
        await AssignAsync(recruitId, managerId);

        var applied = await ApplyAsync(recruit, template.Id);

        Assert.Equal(
            applied.Progress.AssignmentId,
            Assert.Single((await ProgressAsync(recruit))!).AssignmentId
        );
        Assert.Equal(
            applied.Progress.AssignmentId,
            Assert.Single((await ProgressAsync(manager, recruitId))!).AssignmentId
        );
        Assert.Equal(
            applied.Progress.AssignmentId,
            Assert.Single((await ProgressAsync(admin, recruitId))!).AssignmentId
        );

        foreach (var denied in new[] { other, stranger })
        {
            var response = await denied.GetAsync($"/api/v1/checklists/progress?userId={recruitId}");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            var detail = await denied.GetAsync(
                $"/api/v1/checklists/{applied.Progress.AssignmentId}?userId={recruitId}"
            );
            Assert.Equal(HttpStatusCode.NotFound, detail.StatusCode);
        }

        var anonymous = await factory.CreateClient().GetAsync("/api/v1/checklists/progress");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task An_applied_template_can_only_be_retired_while_an_unused_one_is_deleted()
    {
        var (admin, _) = await PromotedAsync(UserRole.Admin);
        var applied = await CreateTemplateAsync(admin, TemplateRequest(Unique("Historic template")));
        var unused = await CreateTemplateAsync(admin, TemplateRequest(Unique("Unused template")));
        var (recruit, _) = await RecruitAsync();
        await ApplyAsync(recruit, applied.Id);

        var conflict = await admin.DeleteAsync($"/api/v1/checklist-templates/{applied.Id}");
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);

        var retired = await admin.PutAsJsonAsync(
            $"/api/v1/checklist-templates/{applied.Id}",
            TemplateRequest(applied.Name, isActive: false)
        );
        Assert.Equal(HttpStatusCode.OK, retired.StatusCode);

        var available = (
            await recruit.GetFromJsonAsync<IReadOnlyList<AvailableChecklistResponse>>(
                "/api/v1/checklist-templates/available",
                JsonOptions.Api
            )
        )!;
        Assert.DoesNotContain(applied.Id, available.Select(a => a.TemplateId));

        // Retiring it never touches the recruit's assignment or their generated tasks.
        Assert.Equal(3, Assert.Single((await ProgressAsync(recruit))!).GeneratedTasks);

        var deleted = await admin.DeleteAsync($"/api/v1/checklist-templates/{unused.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await admin.GetAsync($"/api/v1/checklist-templates/{unused.Id}")).StatusCode
        );
    }
}
