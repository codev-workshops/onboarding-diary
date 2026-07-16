import { expect, test } from "@playwright/test";


async function login(page, email, password) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}


async function createUser(page, { name, email, role }) {
  await page.getByLabel("New user name").fill(name);
  await page.getByLabel("New user email").fill(email);
  await page.getByLabel("New user department").fill("Engineering");
  await page.getByLabel("New user start date").fill("2026-07-15");
  await page.getByLabel("New user password").fill("browser-password");
  await page.getByLabel("New user role").selectOption(role);
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/admin/users") &&
      candidate.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  expect((await response).status()).toBe(201);
  await expect(page.getByText(email, { exact: false })).toBeVisible();
}


test("Admin creates users, replaces assignments, and non-Admin is denied", async ({
  browser,
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const managerOneEmail = `browser-manager-one-${suffix}@example.com`;
  const managerTwoEmail = `browser-manager-two-${suffix}@example.com`;
  const recruitEmail = `browser-assigned-${suffix}@example.com`;
  await login(page, "admin@example.com", "bootstrap-password");
  await expect(
    page.getByRole("button", { name: "Users & Assignments" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Users & Assignments" }).click();

  await createUser(page, {
    name: "Browser Manager One",
    email: managerOneEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: "Browser Manager Two",
    email: managerTwoEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: "Browser Assigned Recruit",
    email: recruitEmail,
    role: "Recruit",
  });

  const recruitCard = page
    .locator("article")
    .filter({ hasText: recruitEmail });
  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: "Browser Manager One" });
  await recruitCard.getByRole("button", { name: "Save assignment" }).click();
  await expect(recruitCard.getByRole("status")).toHaveText("Assignment saved");

  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: "Browser Manager Two" });
  const replacement = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/admin/recruits/") &&
      candidate.request().method() === "PUT",
  );
  await recruitCard.getByRole("button", { name: "Save assignment" }).click();
  expect((await replacement).status()).toBe(200);

  const recruitContext = await browser.newContext();
  const recruitPage = await recruitContext.newPage();
  await login(
    recruitPage,
    recruitEmail,
    "browser-password",
  );
  await expect(
    recruitPage.getByRole("button", { name: "Users & Assignments" }),
  ).toHaveCount(0);
  await expect(
    recruitPage.getByRole("heading", {
      name: "Welcome, Browser Assigned Recruit",
    }),
  ).toBeVisible();
  const denial = await recruitPage.evaluate(async () => {
    const response = await fetch("/api/admin/users", {
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  });
  expect(denial).toEqual({
    status: 403,
    body: {
      error: {
        code: "access_denied",
        message: "Access denied",
      },
    },
  });
  await recruitContext.close();
});


test("Admin self-save triggers one intentional user-list refresh", async ({
  page,
}) => {
  await login(page, "admin@example.com", "bootstrap-password");
  const initialUsers = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/admin/users") &&
      candidate.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  expect((await initialUsers).status()).toBe(200);

  let listRequests = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/admin/users") &&
      request.method() === "GET"
    ) {
      listRequests += 1;
    }
  });

  const adminCard = page
    .locator("article")
    .filter({ hasText: "admin@example.com" });
  const selfSave = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/admin/users/") &&
      candidate.request().method() === "PATCH",
  );
  const intentionalRefresh = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/admin/users") &&
      candidate.request().method() === "GET",
  );
  await adminCard.getByRole("button", { name: /Save user/ }).click();

  expect((await selfSave).status()).toBe(200);
  expect((await intentionalRefresh).status()).toBe(200);
  await page.waitForLoadState("networkidle");
  expect(listRequests).toBe(1);
});


test("Admin role change invalidates the affected user's session and link", async ({
  browser,
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const managerEmail = `session-manager-${suffix}@example.com`;
  const recruitEmail = `session-recruit-${suffix}@example.com`;
  await login(page, "admin@example.com", "bootstrap-password");
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  await createUser(page, {
    name: "Session Manager",
    email: managerEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: "Session Recruit",
    email: recruitEmail,
    role: "Recruit",
  });

  const managerCard = page
    .locator("article")
    .filter({ hasText: managerEmail });
  const recruitCard = page
    .locator("article")
    .filter({ hasText: recruitEmail });
  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: "Session Manager" });
  await recruitCard.getByRole("button", { name: "Save assignment" }).click();
  await expect(recruitCard.getByRole("status")).toHaveText("Assignment saved");

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await login(managerPage, managerEmail, "browser-password");
  await managerPage.getByRole("button", { name: "Profile" }).click();

  await managerCard.getByLabel(/Role for user/).selectOption("Recruit");
  const roleChange = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/admin/users/") &&
      candidate.request().method() === "PATCH",
  );
  await managerCard.getByRole("button", { name: /Save user/ }).click();
  expect((await roleChange).status()).toBe(200);

  await managerPage.getByLabel("Name").fill("Invalidated Session");
  await managerPage.getByRole("button", { name: "Save profile" }).click();
  await expect(
    managerPage.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();

  await expect(
    recruitCard.getByLabel(/Manager assignment for user/),
  ).toHaveValue("");
  await managerContext.close();
});
