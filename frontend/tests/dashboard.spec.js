import { expect, test } from "@playwright/test";


async function login(page, email, password = "browser-password") {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}


async function logout(page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
}


async function signupRecruit(page, email, name) {
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password: "browser-password",
      name,
      department: "Engineering",
      start_date: "2026-07-15",
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}


async function createUser(page, { email, name, role }) {
  const result = await page.evaluate(
    async (payload) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          password: "browser-password",
          department: "Engineering",
          start_date: "2026-07-15",
        }),
      });
      return { status: response.status, body: await response.json() };
    },
    { email, name, role },
  );
  expect(result.status).toBe(201);
  return result.body;
}


async function assignManager(page, recruitId, managerId) {
  const status = await page.evaluate(
    async ({ recruitId: targetId, managerId: assignedId }) => {
      const response = await fetch(
        `/api/admin/recruits/${targetId}/manager`,
        {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manager_id: assignedId }),
        },
      );
      return response.status;
    },
    { recruitId, managerId },
  );
  expect(status).toBe(200);
}


async function createDiaryEntry(page, resource, ownerId, payload) {
  const result = await page.evaluate(
    async ({ resource: path, ownerId: targetId, payload: data }) => {
      const response = await fetch(`/api/${path}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, owner_id: targetId }),
      });
      return { status: response.status, body: await response.json() };
    },
    { resource, ownerId, payload },
  );
  expect(result.status).toBe(201);
  return result.body;
}


async function requestDashboard(page, ownerId) {
  return page.evaluate(async (targetId) => {
    const response = await fetch(`/api/dashboard?owner_id=${targetId}`, {
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  }, ownerId);
}


function projectSuffix(testInfo) {
  return testInfo.project.name.replaceAll("-", "");
}


function dashboardResponse(id, name, taskCount = 0) {
  return {
    recruit: { id, name },
    counts: {
      tasks: taskCount,
      issues: 0,
      feedback: 0,
      notes: 0,
    },
    task_progress_percent: 0,
    open_issue_count: 0,
    open_issues: [],
    recent_activity: [],
  };
}


function profileResponse(role, id, name = `Mock ${role}`) {
  return {
    id,
    email: `mock-${role.toLowerCase()}-${id}@example.com`,
    name,
    role,
    department: role === "Admin" ? "Administration" : "Engineering",
    start_date: "2026-07-15",
    assigned_manager_id: null,
  };
}


async function mockProfile(page, profile) {
  await page.route("**/api/profile", (route) =>
    fulfillJson(route, 200, profile),
  );
}


async function mockAdminProfile(page) {
  await mockProfile(page, profileResponse("Admin", 900, "Mock Admin"));
}


async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}


function deferred() {
  let resolve;
  const promise = new Promise((settled) => {
    resolve = settled;
  });
  return { promise, resolve };
}


test("Admin mount issues one logical Recruit-list request under StrictMode", async ({
  page,
}) => {
  await mockAdminProfile(page);
  const releaseList = deferred();
  let listRequests = 0;
  await page.route("**/api/diary/recruits", async (route) => {
    listRequests += 1;
    await releaseList.promise;
    await fulfillJson(route, 200, [{ id: 10, name: "Single List Recruit" }]);
  });
  await page.route("**/api/dashboard?owner_id=10", (route) =>
    fulfillJson(route, 200, dashboardResponse(10, "Single List Recruit", 10)),
  );

  await page.goto("/");
  await expect.poll(() => listRequests).toBe(1);
  await page.waitForTimeout(100);
  expect(listRequests).toBe(1);

  releaseList.resolve();
  await expect(page.getByLabel("Tasks count")).toHaveText("10");
});


test("Recruit mount issues one logical dashboard request under StrictMode", async ({
  page,
}) => {
  await mockProfile(page, profileResponse("Recruit", 42, "Single Dashboard Recruit"));
  const releaseDashboard = deferred();
  let dashboardRequests = 0;
  await page.route("**/api/dashboard?owner_id=42", async (route) => {
    dashboardRequests += 1;
    await releaseDashboard.promise;
    await fulfillJson(
      route,
      200,
      dashboardResponse(42, "Single Dashboard Recruit", 42),
    );
  });

  await page.goto("/");
  await expect.poll(() => dashboardRequests).toBe(1);
  await page.waitForTimeout(100);
  expect(dashboardRequests).toBe(1);

  releaseDashboard.resolve();
  await expect(page.getByLabel("Tasks count")).toHaveText("42");
});


test("dashboard selection issues one logical request per selected owner", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [
      { id: 11, name: "Initial Owner" },
      { id: 12, name: "Selected Owner" },
    ]),
  );
  const releases = {
    11: deferred(),
    12: deferred(),
  };
  const dashboardRequests = { 11: 0, 12: 0 };
  await page.route("**/api/dashboard?owner_id=*", async (route) => {
    const ownerId = new URL(route.request().url()).searchParams.get("owner_id");
    dashboardRequests[ownerId] += 1;
    await releases[ownerId].promise;
    await fulfillJson(
      route,
      200,
      dashboardResponse(Number(ownerId), `${ownerId} Owner`, Number(ownerId)),
    );
  });

  await page.goto("/");
  await expect.poll(() => dashboardRequests[11]).toBe(1);
  await page.waitForTimeout(100);
  expect(dashboardRequests[11]).toBe(1);
  releases[11].resolve();
  await expect(page.getByLabel("Tasks count")).toHaveText("11");

  await page.getByLabel("Dashboard Recruit").selectOption("12");
  await expect.poll(() => dashboardRequests[12]).toBe(1);
  await page.waitForTimeout(100);
  expect(dashboardRequests[12]).toBe(1);
  releases[12].resolve();
  await expect(page.getByLabel("Tasks count")).toHaveText("12");
  expect(dashboardRequests).toEqual({ 11: 1, 12: 1 });
});


test("dashboard retries canceled and failed requests after navigation", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [
      { id: 13, name: "Canceled Owner" },
      { id: 14, name: "Current Owner" },
    ]),
  );
  await page.route("**/api/tasks**", (route) => fulfillJson(route, 200, []));
  const releaseCanceled = deferred();
  let canceledRequests = 0;
  let failedRequests = 0;
  await page.route("**/api/dashboard?owner_id=*", async (route) => {
    const ownerId = new URL(route.request().url()).searchParams.get("owner_id");
    if (ownerId === "13") {
      canceledRequests += 1;
      if (canceledRequests === 1) {
        await releaseCanceled.promise;
      }
      await fulfillJson(route, 200, dashboardResponse(13, "Canceled Owner", 13))
        .catch(() => {});
      return;
    }
    failedRequests += 1;
    if (failedRequests === 1) {
      await fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Retryable dashboard failed" },
      });
      return;
    }
    await fulfillJson(route, 200, dashboardResponse(14, "Current Owner", 14));
  });

  await page.goto("/");
  await expect.poll(() => canceledRequests).toBe(1);
  await page.getByLabel("Dashboard Recruit").selectOption("14");
  await expect(page.getByRole("status")).toHaveText("Retryable dashboard failed");
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  releaseCanceled.resolve();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByLabel("Tasks count")).toHaveText("13");
  await page.getByLabel("Dashboard Recruit").selectOption("14");
  await expect(page.getByLabel("Tasks count")).toHaveText("14");
  expect(canceledRequests).toBe(2);
  expect(failedRequests).toBe(2);
});


test("logout and login do not reuse prior in-flight dashboard data", async ({
  page,
}) => {
  await page.route("**/api/profile", (route) =>
    fulfillJson(route, 200, profileResponse("Recruit", 42, "Prior Recruit")),
  );
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/auth/login", (route) =>
    fulfillJson(route, 200, profileResponse("Recruit", 42, "Next Recruit")),
  );
  const releasePrior = deferred();
  let dashboardRequests = 0;
  await page.route("**/api/dashboard?owner_id=42", async (route) => {
    dashboardRequests += 1;
    if (dashboardRequests === 1) {
      await releasePrior.promise;
      await fulfillJson(route, 200, dashboardResponse(42, "Prior Recruit", 111))
        .catch(() => {});
      return;
    }
    await fulfillJson(route, 200, dashboardResponse(42, "Next Recruit", 222));
  });

  await page.goto("/");
  await expect.poll(() => dashboardRequests).toBe(1);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill("next-recruit@example.com");
  await page.getByLabel("Password").fill("browser-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByLabel("Tasks count")).toHaveText("222");
  expect(dashboardRequests).toBe(2);
  releasePrior.resolve();
  await page.waitForTimeout(100);
  await expect(page.getByLabel("Tasks count")).toHaveText("222");
});


test("Recruit dashboard shows scoped metrics and refreshes after task CRUD", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  const email = `dashboard-recruit-${suffix}@example.com`;
  const recruit = await signupRecruit(page, email, "Dashboard Recruit");
  await login(page, email);

  await createDiaryEntry(page, "tasks", recruit.id, {
    date: "2026-07-16",
    title: "Completed dashboard task",
    description: "Complete setup",
    category: "Setup",
    status: "Completed",
    priority: "High",
  });
  await createDiaryEntry(page, "tasks", recruit.id, {
    date: "2026-07-15",
    title: "Pending dashboard task",
    description: "",
    category: "Training",
    status: "Not Started",
    priority: "Low",
  });
  await createDiaryEntry(page, "issues", recruit.id, {
    date: "2026-07-16",
    title: "Open dashboard issue",
    description: "Waiting for access",
    severity: "Critical",
    status: "Open",
    resolution_notes: "",
  });
  await createDiaryEntry(page, "issues", recruit.id, {
    date: "2026-07-14",
    title: "Closed dashboard issue",
    description: "Resolved access",
    severity: "Low",
    status: "Closed",
    resolution_notes: "Access granted",
  });
  await createDiaryEntry(page, "feedback", recruit.id, {
    date: "2026-07-13",
    subject: "Dashboard feedback",
    type: "Suggestion",
    details: "Add a checklist",
  });
  await createDiaryEntry(page, "notes", recruit.id, {
    date: "2026-07-12",
    title: "Dashboard note",
    content: "Remember the release steps",
    tags: ["comma,tag", "release"],
  });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome, Dashboard Recruit" }),
  ).toBeVisible();
  await expect(page.getByLabel("Tasks count")).toHaveText("2");
  await expect(page.getByLabel("Issues count")).toHaveText("2");
  await expect(page.getByLabel("Feedback count")).toHaveText("1");
  await expect(page.getByLabel("Notes count")).toHaveText("1");
  await expect(page.getByRole("progressbar", { name: "Task completion" })).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  await expect(
    page.getByRole("heading", { name: "Open dashboard issue" }),
  ).toBeVisible();
  await expect(page.getByText("Closed dashboard issue")).toBeVisible();
  await expect(page.getByText("comma,tag")).toBeVisible();

  await page.getByRole("button", { name: "Tasks" }).click();
  await page.getByLabel("Task date").fill("2026-07-17");
  await page.getByLabel("Task title").fill("Created from dashboard journey");
  await page.getByLabel("Task description").fill("Verify refreshed metrics");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByRole("status")).toHaveText("Task created");
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByLabel("Tasks count")).toHaveText("3");
  await expect(page.getByRole("progressbar", { name: "Task completion" })).toHaveAttribute(
    "aria-valuenow",
    "33",
  );
  await expect(page.getByRole("heading", { name: "Created from dashboard journey" })).toBeVisible();
});


test("dashboard ignores a delayed prior Recruit response after selection changes", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [
      { id: 1, name: "First Recruit" },
      { id: 2, name: "Second Recruit" },
    ]),
  );

  let markFirstRequested;
  const firstRequested = new Promise((resolve) => {
    markFirstRequested = resolve;
  });
  let releaseFirst;
  const firstRelease = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let markFirstSettled;
  const firstSettled = new Promise((resolve) => {
    markFirstSettled = resolve;
  });

  await page.route("**/api/dashboard?owner_id=*", async (route) => {
    const ownerId = new URL(route.request().url()).searchParams.get("owner_id");
    if (ownerId === "1") {
      markFirstRequested();
      await firstRelease;
      await fulfillJson(
        route,
        200,
        dashboardResponse(1, "First Recruit", 101),
      ).catch(() => {});
      markFirstSettled();
      return;
    }
    await fulfillJson(route, 200, dashboardResponse(2, "Second Recruit", 202));
  });

  await page.goto("/");
  await firstRequested;
  await page.getByLabel("Dashboard Recruit").selectOption("2");
  await expect(page.getByLabel("Tasks count")).toHaveText("202");

  releaseFirst();
  await firstSettled;
  await expect(page.getByLabel("Tasks count")).toHaveText("202");
  await expect(page.getByText("101", { exact: true })).toHaveCount(0);
});


test("dashboard ignores a delayed prior error and keeps the latest request loading", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [
      { id: 3, name: "Failing Recruit" },
      { id: 4, name: "Current Recruit" },
    ]),
  );

  let markFirstRequested;
  const firstRequested = new Promise((resolve) => {
    markFirstRequested = resolve;
  });
  let releaseFirst;
  const firstRelease = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let markFirstSettled;
  const firstSettled = new Promise((resolve) => {
    markFirstSettled = resolve;
  });
  let releaseSecond;
  const secondRelease = new Promise((resolve) => {
    releaseSecond = resolve;
  });

  await page.route("**/api/dashboard?owner_id=*", async (route) => {
    const ownerId = new URL(route.request().url()).searchParams.get("owner_id");
    if (ownerId === "3") {
      markFirstRequested();
      await firstRelease;
      await fulfillJson(route, 500, {
        error: { code: "stale_failure", message: "Stale dashboard failed" },
      }).catch(() => {});
      markFirstSettled();
      return;
    }
    await secondRelease;
    await fulfillJson(route, 200, dashboardResponse(4, "Current Recruit", 404));
  });

  await page.goto("/");
  await firstRequested;
  await page.getByLabel("Dashboard Recruit").selectOption("4");
  await expect(page.getByText("Loading dashboard.")).toBeVisible();

  releaseFirst();
  await firstSettled;
  await expect(page.getByText("Loading dashboard.")).toBeVisible();
  await expect(page.getByText("Stale dashboard failed")).toHaveCount(0);

  releaseSecond();
  await expect(page.getByLabel("Tasks count")).toHaveText("404");
  await expect(page.getByText("Stale dashboard failed")).toHaveCount(0);
});


test("delayed Recruit list shows loading before rendering the loaded list", async ({
  page,
}) => {
  await mockAdminProfile(page);
  let releaseRecruits;
  const recruitsRelease = new Promise((resolve) => {
    releaseRecruits = resolve;
  });
  await page.route("**/api/diary/recruits", async (route) => {
    await recruitsRelease;
    await fulfillJson(route, 200, [{ id: 7, name: "Loaded Recruit" }]);
  });
  await page.route("**/api/dashboard?owner_id=7", (route) =>
    fulfillJson(route, 200, dashboardResponse(7, "Loaded Recruit", 7)),
  );

  await page.goto("/");
  await expect(page.getByText("Loading dashboard.")).toBeVisible();
  await expect(
    page.getByText("No recruits are available for your dashboard."),
  ).toHaveCount(0);

  releaseRecruits();
  await expect(page.getByLabel("Dashboard Recruit")).toHaveValue("7");
  await expect(page.getByLabel("Dashboard Recruit").locator("option")).toHaveText(
    "Loaded Recruit",
  );
  await expect(page.getByLabel("Tasks count")).toHaveText("7");
});


test("delayed empty Recruit list shows loading before the true empty state", async ({
  page,
}) => {
  await mockAdminProfile(page);
  let releaseRecruits;
  const recruitsRelease = new Promise((resolve) => {
    releaseRecruits = resolve;
  });
  await page.route("**/api/diary/recruits", async (route) => {
    await recruitsRelease;
    await fulfillJson(route, 200, []);
  });

  await page.goto("/");
  await expect(page.getByText("Loading dashboard.")).toBeVisible();
  await expect(
    page.getByText("No recruits are available for your dashboard."),
  ).toHaveCount(0);

  releaseRecruits();
  await expect(
    page.getByText("No recruits are available for your dashboard."),
  ).toBeVisible();
  await expect(page.getByLabel("Dashboard Recruit")).toHaveValue("");
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("Recruit-list 401 clears the session", async ({ page }) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 401, {
      error: {
        code: "not_authenticated",
        message: "Authentication required",
      },
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("dashboard 401 clears the session", async ({ page }) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [{ id: 8, name: "Expired Recruit" }]),
  );
  await page.route("**/api/dashboard?owner_id=8", (route) =>
    fulfillJson(route, 401, {
      error: {
        code: "not_authenticated",
        message: "Authentication required",
      },
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("Recruit-list failure exits loading and shows the request error", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 500, {
      error: { code: "list_failed", message: "Recruit list failed" },
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Recruit list failed");
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("dashboard failure exits loading and shows the request error", async ({
  page,
}) => {
  await mockAdminProfile(page);
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [{ id: 9, name: "Failure Recruit" }]),
  );
  await page.route("**/api/dashboard?owner_id=9", (route) =>
    fulfillJson(route, 500, {
      error: { code: "dashboard_failed", message: "Dashboard failed" },
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Dashboard failed");
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("assigned Manager dashboard lists only assigned Recruit data", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const recruit = await createUser(page, {
    email: `manager-target-${suffix}@example.com`,
    name: "Manager Dashboard Recruit",
    role: "Recruit",
  });
  const otherRecruit = await createUser(page, {
    email: `manager-other-${suffix}@example.com`,
    name: "Hidden Manager Recruit",
    role: "Recruit",
  });
  const manager = await createUser(page, {
    email: `dashboard-manager-${suffix}@example.com`,
    name: "Dashboard Manager",
    role: "Manager",
  });
  await assignManager(page, recruit.id, manager.id);
  await createDiaryEntry(page, "tasks", recruit.id, {
    date: "2026-07-16",
    title: "Assigned manager task",
    description: "",
    category: "Project",
    status: "In Progress",
    priority: "High",
  });
  await createDiaryEntry(page, "tasks", otherRecruit.id, {
    date: "2026-07-16",
    title: "Hidden manager task",
    description: "",
    category: "Project",
    status: "Completed",
    priority: "High",
  });
  await logout(page);

  await login(page, `dashboard-manager-${suffix}@example.com`);
  const selector = page.getByLabel("Dashboard Recruit");
  await expect(selector).toHaveValue(String(recruit.id));
  await expect(selector.locator("option")).toHaveCount(1);
  await expect(selector.locator("option")).toHaveText("Manager Dashboard Recruit");
  await expect(page.getByLabel("Tasks count")).toHaveText("1");
  await expect(page.getByText("Assigned manager task")).toBeVisible();
  await expect(page.getByText("Hidden manager task")).toHaveCount(0);

  const denied = await requestDashboard(page, otherRecruit.id);
  expect(denied).toEqual({
    status: 403,
    body: { error: { code: "access_denied", message: "Access denied" } },
  });
  expect(JSON.stringify(denied.body)).not.toContain("Hidden Manager Recruit");
});


test("Admin dashboard switches between populated and empty Recruit scopes", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const populated = await createUser(page, {
    email: `admin-populated-${suffix}@example.com`,
    name: "Admin Populated Recruit",
    role: "Recruit",
  });
  const empty = await createUser(page, {
    email: `admin-empty-${suffix}@example.com`,
    name: "Admin Empty Recruit",
    role: "Recruit",
  });
  await createDiaryEntry(page, "feedback", populated.id, {
    date: "2026-07-16",
    subject: "Admin dashboard feedback",
    type: "Positive",
    details: "Visible to Admin",
  });

  await page.reload();
  const selector = page.getByLabel("Dashboard Recruit");
  await selector.selectOption(String(populated.id));
  await expect(page.getByLabel("Feedback count")).toHaveText("1");
  await expect(page.getByText("Admin dashboard feedback")).toBeVisible();

  await selector.selectOption(String(empty.id));
  await expect(page.getByLabel("Tasks count")).toHaveText("0");
  await expect(page.getByLabel("Issues count")).toHaveText("0");
  await expect(page.getByLabel("Feedback count")).toHaveText("0");
  await expect(page.getByLabel("Notes count")).toHaveText("0");
  await expect(page.getByText("No open issues.")).toBeVisible();
  await expect(page.getByText("No diary activity yet.")).toBeVisible();

  const unknown = await requestDashboard(page, 999999);
  expect(unknown).toEqual({
    status: 403,
    body: { error: { code: "access_denied", message: "Access denied" } },
  });
});


test("other Recruit and unassigned Manager denials reveal no target existence", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const target = await createUser(page, {
    email: `denial-target-${suffix}@example.com`,
    name: "Secret Dashboard Recruit",
    role: "Recruit",
  });
  await createUser(page, {
    email: `denial-other-${suffix}@example.com`,
    name: "Other Dashboard Recruit",
    role: "Recruit",
  });
  await createUser(page, {
    email: `denial-manager-${suffix}@example.com`,
    name: "Unassigned Dashboard Manager",
    role: "Manager",
  });
  await createDiaryEntry(page, "notes", target.id, {
    date: "2026-07-16",
    title: "Secret dashboard note",
    content: "Must not leak",
    tags: ["secret"],
  });
  await logout(page);

  await login(page, `denial-other-${suffix}@example.com`);
  await expect(page.getByLabel("Dashboard Recruit")).toHaveCount(0);
  const recruitKnown = await requestDashboard(page, target.id);
  const recruitUnknown = await requestDashboard(page, 999999);
  expect(recruitKnown).toEqual(recruitUnknown);
  expect(recruitKnown).toEqual({
    status: 403,
    body: { error: { code: "access_denied", message: "Access denied" } },
  });
  expect(JSON.stringify(recruitKnown.body)).not.toContain("Secret dashboard");
  await logout(page);

  await login(page, `denial-manager-${suffix}@example.com`);
  await expect(page.getByLabel("Dashboard Recruit")).toHaveValue("");
  await expect(page.getByText("No recruits are available for your dashboard.")).toBeVisible();
  await expect(page.getByText("Secret Dashboard Recruit")).toHaveCount(0);
  const managerKnown = await requestDashboard(page, target.id);
  const managerUnknown = await requestDashboard(page, 999999);
  expect(managerKnown).toEqual(managerUnknown);
  expect(managerKnown).toEqual(recruitKnown);
});


async function mockRoleProfile(page, role) {
  const id = role === "Admin" ? 951 : 851;
  await mockProfile(page, profileResponse(role, id, `Mock ${role}`));
}


const retryButton = (page) =>
  page.getByRole("button", { name: "Retry dashboard" });


for (const role of ["Manager", "Admin"]) {
  test(`${role} retry stays visible when the dashboard failure settles after recruit-list success on retry`, async ({
    page,
  }) => {
    await mockRoleProfile(page, role);
    let listCalls = 0;
    const heldListSuccess = deferred();
    await page.route("**/api/diary/recruits", async (route) => {
      listCalls += 1;
      if (listCalls >= 2) {
        await heldListSuccess.promise;
      }
      await fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]);
    });
    let dashboardCalls = 0;
    const heldDashboardFailure = deferred();
    await page.route("**/api/dashboard?owner_id=21", async (route) => {
      dashboardCalls += 1;
      if (dashboardCalls >= 2) {
        await heldDashboardFailure.promise;
      }
      await fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Dashboard failed" },
      });
    });

    await page.goto("/");
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");
    await expect(retryButton(page)).toBeVisible();

    await retryButton(page).click();
    await expect.poll(() => dashboardCalls).toBeGreaterThanOrEqual(2);
    await expect.poll(() => listCalls).toBeGreaterThanOrEqual(2);

    heldDashboardFailure.resolve();
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");
    heldListSuccess.resolve();

    await expect(page.getByLabel("Dashboard Recruit")).toHaveValue("21");
    await expect(retryButton(page)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");
    await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
  });


  test(`${role} retry stays visible when the dashboard failure settles before recruit-list success on retry`, async ({
    page,
  }) => {
    await mockRoleProfile(page, role);
    let listCalls = 0;
    const heldListSuccess = deferred();
    await page.route("**/api/diary/recruits", async (route) => {
      listCalls += 1;
      if (listCalls >= 2) {
        await heldListSuccess.promise;
      }
      await fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]);
    });
    let dashboardCalls = 0;
    const heldDashboardFailure = deferred();
    await page.route("**/api/dashboard?owner_id=21", async (route) => {
      dashboardCalls += 1;
      if (dashboardCalls >= 2) {
        await heldDashboardFailure.promise;
      }
      await fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Dashboard failed" },
      });
    });

    await page.goto("/");
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");
    await expect(retryButton(page)).toBeVisible();

    await retryButton(page).click();
    await expect.poll(() => dashboardCalls).toBeGreaterThanOrEqual(2);
    await expect.poll(() => listCalls).toBeGreaterThanOrEqual(2);

    heldListSuccess.resolve();
    heldDashboardFailure.resolve();

    await expect(page.getByLabel("Dashboard Recruit")).toHaveValue("21");
    await expect(retryButton(page)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");
    await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
  });


  test(`${role} retry remains available through repeated dashboard failures`, async ({
    page,
  }) => {
    await mockRoleProfile(page, role);
    await page.route("**/api/diary/recruits", (route) =>
      fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]),
    );
    let dashboardCalls = 0;
    await page.route("**/api/dashboard?owner_id=21", (route) => {
      dashboardCalls += 1;
      return fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Dashboard failed" },
      });
    });

    await page.goto("/");
    await expect(retryButton(page)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Dashboard failed");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const before = dashboardCalls;
      await retryButton(page).click();
      await expect.poll(() => dashboardCalls).toBeGreaterThan(before);
      await expect(retryButton(page)).toBeVisible();
      await expect(page.getByRole("status")).toHaveText("Dashboard failed");
      await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
    }
  });
}


test("Admin recruit-list failure keeps its own retry while no dashboard request runs", async ({
  page,
}) => {
  await mockRoleProfile(page, "Admin");
  let listCalls = 0;
  await page.route("**/api/diary/recruits", (route) => {
    listCalls += 1;
    return fulfillJson(route, 500, {
      error: { code: "list_failed", message: "Recruit list failed" },
    });
  });
  let dashboardCalls = 0;
  await page.route("**/api/dashboard?owner_id=*", (route) => {
    dashboardCalls += 1;
    return fulfillJson(route, 200, dashboardResponse(21, "Race Recruit", 21));
  });

  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Recruit list failed");
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
  await page.waitForTimeout(100);
  expect(dashboardCalls).toBe(0);
  expect(listCalls).toBeGreaterThanOrEqual(1);
});


test("Manager retry stays visible when both recruit-list and dashboard fail on retry", async ({
  page,
}) => {
  await mockRoleProfile(page, "Manager");
  let listCalls = 0;
  await page.route("**/api/diary/recruits", (route) => {
    listCalls += 1;
    if (listCalls === 1) {
      return fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]);
    }
    return fulfillJson(route, 500, {
      error: { code: "list_failed", message: "Recruit list failed" },
    });
  });
  await page.route("**/api/dashboard?owner_id=21", (route) =>
    fulfillJson(route, 500, {
      error: { code: "dashboard_failed", message: "Dashboard failed" },
    }),
  );

  await page.goto("/");
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Dashboard failed");

  await retryButton(page).click();
  await expect.poll(() => listCalls).toBeGreaterThanOrEqual(2);
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("Admin successful retry clears the dashboard retry affordance", async ({
  page,
}) => {
  await mockRoleProfile(page, "Admin");
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]),
  );
  let dashboardCalls = 0;
  await page.route("**/api/dashboard?owner_id=21", (route) => {
    dashboardCalls += 1;
    if (dashboardCalls === 1) {
      return fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Dashboard failed" },
      });
    }
    return fulfillJson(route, 200, dashboardResponse(21, "Race Recruit", 21));
  });

  await page.goto("/");
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Dashboard failed");

  await retryButton(page).click();
  await expect(page.getByLabel("Tasks count")).toHaveText("21");
  await expect(retryButton(page)).toHaveCount(0);
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});


test("Admin owner change to a healthy Recruit clears a prior dashboard retry", async ({
  page,
}) => {
  await mockRoleProfile(page, "Admin");
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [
      { id: 21, name: "Failing Recruit" },
      { id: 22, name: "Healthy Recruit" },
    ]),
  );
  await page.route("**/api/dashboard?owner_id=21", (route) =>
    fulfillJson(route, 500, {
      error: { code: "dashboard_failed", message: "Dashboard failed" },
    }),
  );
  await page.route("**/api/dashboard?owner_id=22", (route) =>
    fulfillJson(route, 200, dashboardResponse(22, "Healthy Recruit", 22)),
  );

  await page.goto("/");
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Dashboard failed");

  await page.getByLabel("Dashboard Recruit").selectOption("22");
  await expect(page.getByLabel("Tasks count")).toHaveText("22");
  await expect(retryButton(page)).toHaveCount(0);
});


test("Admin dashboard 401 on retry clears the session", async ({ page }) => {
  await mockRoleProfile(page, "Admin");
  await page.route("**/api/diary/recruits", (route) =>
    fulfillJson(route, 200, [{ id: 21, name: "Race Recruit" }]),
  );
  let dashboardCalls = 0;
  await page.route("**/api/dashboard?owner_id=21", (route) => {
    dashboardCalls += 1;
    if (dashboardCalls === 1) {
      return fulfillJson(route, 500, {
        error: { code: "dashboard_failed", message: "Dashboard failed" },
      });
    }
    return fulfillJson(route, 401, {
      error: { code: "not_authenticated", message: "Authentication required" },
    });
  });

  await page.goto("/");
  await expect(retryButton(page)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Dashboard failed");

  await retryButton(page).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Loading dashboard.")).toHaveCount(0);
});

