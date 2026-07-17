import path from "node:path";

import { expect, test } from "@playwright/test";


function suffix(testInfo) {
  return testInfo.project.name.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase();
}


async function signup(page, testInfo, name = "Hardening Recruit") {
  const email = `hardening-${suffix(testInfo)}-${Date.now()}@example.com`;
  const password = "hardening-password";
  const response = await page.request.post("/api/auth/signup", {
    data: {
      name,
      email,
      department: "Engineering",
      start_date: "2026-07-15",
      password,
    },
  });
  expect(response.status()).toBe(201);
  return { email, password, profile: await response.json() };
}


async function login(page, email, password) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}


async function expectNoPageOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}


async function captureEvidence(page, testInfo, name) {
  const directory = process.env.G_G_SCREENSHOT_DIR;
  if (!directory) {
    return;
  }
  await page.screenshot({
    path: path.join(directory, `${name}-${testInfo.project.name}.png`),
    fullPage: true,
  });
}


test("core Recruit flows remain keyboard-accessible without viewport overflow", async ({
  page,
}, testInfo) => {
  const recruit = await signup(page, testInfo);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.evaluate(() => document.activeElement?.blur());

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Log in" })).toBeFocused();
  await expectNoPageOverflow(page);

  await page.getByLabel("Email").fill(recruit.email);
  await page.getByLabel("Password").fill(recruit.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Hardening Recruit" }),
  ).toBeVisible();

  const longTitle = "T".repeat(120);
  const longContent = "C".repeat(5000);
  expect(
    (
      await page.request.post("/api/notes", {
        data: {
          date: "2026-07-16",
          title: longTitle,
          content: longContent,
          tags: ["z".repeat(30)],
        },
      })
    ).status(),
  ).toBe(201);

  const pages = [
    ["Dashboard", "Welcome, Hardening Recruit"],
    ["Tasks", "Tasks"],
    ["Issues", "Issues"],
    ["Feedback", "Feedback"],
    ["Notes", "Notes"],
    ["Reports", "Reports"],
    ["Profile", "Profile"],
  ];
  for (const [button, heading] of pages) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
  }

  await page.getByLabel("Name").fill(" ");
  await page.getByLabel("Department").fill("Preserved Department");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Department")).toHaveValue("Preserved Department");
  await expect(page.getByText(/Name must be between/)).toBeVisible();
  await expectNoPageOverflow(page);
  await captureEvidence(page, testInfo, "core-validation");
});


test("network, 5xx, and expired-session states recover safely", async ({
  page,
}, testInfo) => {
  let failStartup = true;
  await page.route("**/api/profile", (route) => {
    if (failStartup && route.request().method() === "GET") {
      return route.abort("connectionfailed");
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Unable to load your diary" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Unable to reach the server; please retry",
  );
  failStartup = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  const recruit = await signup(page, testInfo, "Recovery Recruit");
  let failDashboard = true;
  await page.route("**/api/dashboard?*", (route) => {
    if (failDashboard) {
      failDashboard = false;
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "server_error",
            message: "An unexpected error occurred; please retry",
          },
        }),
      });
    }
    return route.continue();
  });
  await login(page, recruit.email, recruit.password);
  await expect(page.getByRole("status")).toHaveText(
    "An unexpected error occurred; please retry",
  );
  await captureEvidence(page, testInfo, "dashboard-retry");
  await page.getByRole("button", { name: "Retry dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Recovery Recruit" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Profile" }).click();
  await page.route("**/api/profile", (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "authentication_required",
            message: "Authentication required",
          },
        }),
      });
    }
    return route.continue();
  });
  await page.getByLabel("Name").fill("Expired Session Value");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Expired Session Value")).toHaveCount(0);
});


test("Diary filters ignore delayed stale responses", async ({ page }, testInfo) => {
  const recruit = await signup(page, testInfo, "Coordinated Recruit");
  await login(page, recruit.email, recruit.password);
  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByText("No tasks found.")).toBeVisible();

  let releaseStale;
  let markStaleSeen;
  const staleRelease = new Promise((resolve) => {
    releaseStale = resolve;
  });
  const staleSeen = new Promise((resolve) => {
    markStaleSeen = resolve;
  });
  let staleDone;
  const staleCompleted = new Promise((resolve) => {
    staleDone = resolve;
  });
  await page.route("**/api/tasks?*", async (route) => {
    const date = new URL(route.request().url()).searchParams.get("date");
    if (date === "2026-07-16") {
      markStaleSeen();
      await staleRelease;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1001,
            owner_id: recruit.profile.id,
            date,
            title: "Stale task",
            description: "Must never replace current data",
            category: "Training",
            status: "Not Started",
            priority: "Medium",
            created_at: "2026-07-16T12:00:00Z",
          },
        ]),
      });
      staleDone();
      return;
    }
    if (date === "2026-07-17") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1002,
            owner_id: recruit.profile.id,
            date,
            title: "Current task",
            description: "Current coordinated result",
            category: "Training",
            status: "In Progress",
            priority: "High",
            created_at: "2026-07-17T12:00:00Z",
          },
        ]),
      });
    }
    return route.continue();
  });

  await page.getByLabel("Filter date").fill("2026-07-16");
  await staleSeen;
  await page.getByLabel("Filter date").fill("2026-07-17");
  await expect(page.getByText("Current task")).toBeVisible();
  releaseStale();
  await staleCompleted;
  await expect(page.getByText("Stale task")).toHaveCount(0);
  await expect(page.getByText("Current task")).toBeVisible();
});


test("Admin recovery preserves loaded users and destructive actions require confirmation", async ({
  page,
}, testInfo) => {
  await login(page, "admin@example.com", "bootstrap-password");
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  const email = `confirmation-${suffix(testInfo)}-${Date.now()}@example.com`;
  const recruitName = `Confirmation Recruit ${suffix(testInfo)}`;
  const created = await page.request.post("/api/admin/users", {
    data: {
      name: recruitName,
      email,
      department: "Engineering",
      start_date: "2026-07-15",
      password: "confirmation-password",
      role: "Recruit",
    },
  });
  expect(created.status()).toBe(201);
  await page.reload();
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  const card = page.locator("article").filter({ hasText: recruitName });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: recruitName }).click();
  await expect(card.getByText(email, { exact: false })).toBeVisible();
  await expectNoPageOverflow(page);

  let failReload = true;
  await page.route("**/api/admin/users", (route) => {
    if (failReload && route.request().method() === "GET") {
      failReload = false;
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "server_error",
            message: "An unexpected error occurred; please retry",
          },
        }),
      });
    }
    return route.continue();
  });
  await card.getByRole("button", { name: /Save user/ }).click();
  await expect(page.getByText("An unexpected error occurred; please retry")).toBeVisible();
  await expect(card).toBeVisible();
  await captureEvidence(page, testInfo, "admin-preserved-state");
  await page.getByRole("button", { name: "Retry loading users" }).click();
  await expect(card).toBeVisible();

  page.once("dialog", (dialog) => dialog.dismiss());
  await card.getByRole("button", { name: /Delete user/ }).click();
  await expect(card).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: /Delete user/ }).click();
  await expect(card).toHaveCount(0);
});
