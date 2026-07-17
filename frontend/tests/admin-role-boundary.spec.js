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
  await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
}


async function openUserCard(page, name) {
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name }) });
  const toggle = card.getByRole("button", { name }).first();
  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click();
  }
  return card;
}


test("Admin creates users, replaces assignments, and non-Admin is denied", async ({
  browser,
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const managerOneName = `Browser Manager One ${suffix}`;
  const managerTwoName = `Browser Manager Two ${suffix}`;
  const recruitName = `Browser Assigned Recruit ${suffix}`;
  const managerOneEmail = `browser-manager-one-${suffix}@example.com`;
  const managerTwoEmail = `browser-manager-two-${suffix}@example.com`;
  const recruitEmail = `browser-assigned-${suffix}@example.com`;
  await login(page, "admin@example.com", "bootstrap-password");
  await expect(
    page.getByRole("button", { name: "Users & Assignments" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Users & Assignments" }).click();

  await createUser(page, {
    name: managerOneName,
    email: managerOneEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: managerTwoName,
    email: managerTwoEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: recruitName,
    email: recruitEmail,
    role: "Recruit",
  });

  const recruitCard = await openUserCard(page, recruitName);
  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: managerOneName });
  await recruitCard.getByRole("button", { name: "Save assignment" }).click();
  await expect(recruitCard.getByRole("status")).toHaveText("Assignment saved");

  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: managerTwoName });
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
      name: `Welcome, ${recruitName}`,
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

  const adminCard = await openUserCard(page, "Bootstrap Admin");
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
  const managerName = `Session Manager ${suffix}`;
  const recruitName = `Session Recruit ${suffix}`;
  const managerEmail = `session-manager-${suffix}@example.com`;
  const recruitEmail = `session-recruit-${suffix}@example.com`;
  await login(page, "admin@example.com", "bootstrap-password");
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  await createUser(page, {
    name: managerName,
    email: managerEmail,
    role: "Manager",
  });
  await createUser(page, {
    name: recruitName,
    email: recruitEmail,
    role: "Recruit",
  });

  const managerCard = await openUserCard(page, managerName);
  const recruitCard = await openUserCard(page, recruitName);
  await recruitCard
    .getByLabel(/Manager assignment for user/)
    .selectOption({ label: managerName });
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
