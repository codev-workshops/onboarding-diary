import { expect, test } from "@playwright/test";


async function login(page, email, password) {
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


async function adminCreateUser(page, { email, name, role }) {
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


async function createTaskThroughUi(page, title, recruitName) {
  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  if (recruitName) {
    await page.getByLabel("Recruit").selectOption({ label: recruitName });
  }
  await page.getByLabel("Task date").fill("2026-07-16");
  await page.getByLabel("Task title").fill(title);
  await page.getByLabel("Task description").fill("Complete the browser journey");
  await page.getByLabel("Task category").selectOption("Training");
  await page.locator('form select[name="status"]').selectOption("Not Started");
  await page.getByLabel("Task priority").selectOption("High");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.locator('form select[name="status"]').selectOption("Completed");
  await page.getByRole("button", { name: "Save Task" }).click();
  await page.getByLabel("Filter task status").selectOption("Completed");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Training · Completed · High")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
}


async function createIssueThroughUi(page, title, recruitName) {
  await page.getByRole("button", { name: "Issues" }).click();
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
  if (recruitName) {
    await page.getByLabel("Recruit").selectOption({ label: recruitName });
  }
  await page.getByLabel("Issue date").fill("2026-07-16");
  await page.getByLabel("Issue title").fill(title);
  await page.getByLabel("Issue description").fill("Browser cannot reach the VPN");
  await page.getByLabel("Issue severity").selectOption("Critical");
  await page.locator('form select[name="status"]').selectOption("Open");
  await page.getByRole("button", { name: "Create Issue" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.locator('form select[name="status"]').selectOption("Resolved");
  await page.getByLabel("Resolution notes").fill("Certificate was replaced");
  await page.getByRole("button", { name: "Save Issue" }).click();
  await page.getByLabel("Filter issue status").selectOption("Resolved");
  await page.getByLabel("Filter severity").selectOption("Critical");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Resolution: Certificate was replaced")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
}


async function setupManagedRecruit(page, suffix) {
  await login(page, "admin@example.com", "bootstrap-password");
  const recruit = await adminCreateUser(page, {
    email: `diary-recruit-${suffix}@example.com`,
    name: `Diary Recruit ${suffix}`,
    role: "Recruit",
  });
  const assignedManager = await adminCreateUser(page, {
    email: `diary-manager-${suffix}@example.com`,
    name: `Diary Manager ${suffix}`,
    role: "Manager",
  });
  const unassignedManager = await adminCreateUser(page, {
    email: `unassigned-manager-${suffix}@example.com`,
    name: `Unassigned Manager ${suffix}`,
    role: "Manager",
  });
  const otherRecruit = await adminCreateUser(page, {
    email: `other-recruit-${suffix}@example.com`,
    name: `Other Recruit ${suffix}`,
    role: "Recruit",
  });
  await assignManager(page, recruit.id, assignedManager.id);
  return { recruit, assignedManager, unassignedManager, otherRecruit };
}


test("Recruit maintains and filters own tasks and issues", async ({
  page,
}, testInfo) => {
  const suffix = `self-${testInfo.project.name}`;
  const email = `diary-self-${testInfo.project.name}@example.com`;
  await signupRecruit(page, email, `Diary Self ${suffix}`);
  await login(page, email, "browser-password");

  await createTaskThroughUi(page, `Self task ${suffix}`);
  await createIssueThroughUi(page, `Self issue ${suffix}`);
});


test("assigned Manager and Admin maintain a Recruit's tasks and issues", async ({
  page,
}, testInfo) => {
  const suffix = `allowed-${testInfo.project.name}`;
  const fixtures = await setupManagedRecruit(page, suffix);

  await createTaskThroughUi(
    page,
    `Admin task ${suffix}`,
    fixtures.recruit.name,
  );
  await createIssueThroughUi(
    page,
    `Admin issue ${suffix}`,
    fixtures.recruit.name,
  );

  await logout(page);
  await login(page, fixtures.assignedManager.email, "browser-password");
  await createTaskThroughUi(
    page,
    `Manager task ${suffix}`,
    fixtures.recruit.name,
  );
  await createIssueThroughUi(
    page,
    `Manager issue ${suffix}`,
    fixtures.recruit.name,
  );
});


async function resourceProbe(page, resource, targetId, itemId) {
  const base =
    resource === "tasks"
      ? {
          owner_id: targetId,
          date: "2026-07-16",
          title: "Denied task",
          description: "",
          category: "Training",
          status: "Not Started",
          priority: "Medium",
        }
      : {
          owner_id: targetId,
          date: "2026-07-16",
          title: "Denied issue",
          description: "Denied issue description",
          severity: "High",
          status: "Open",
          resolution_notes: "",
        };
  return page.evaluate(
    async ({ resource: resourceName, targetId: ownerId, itemId: recordId, base: body }) => {
      const requests = [
        fetch(`/api/${resourceName}?owner_id=${ownerId}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/${resourceName}/${recordId}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/${resourceName}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        fetch(`/api/${resourceName}/${recordId}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Tampered" }),
        }),
        fetch(`/api/${resourceName}/${recordId}`, {
          method: "DELETE",
          credentials: "same-origin",
        }),
      ];
      return Promise.all(
        requests.map(async (request) => {
          const response = await request;
          return { status: response.status, body: await response.json() };
        }),
      );
    },
    { resource, targetId, itemId, base },
  );
}


function expectUniformDenial(results) {
  expect(results).toHaveLength(5);
  for (const result of results) {
    expect(result).toEqual({
      status: 403,
      body: {
        error: {
          code: "access_denied",
          message: "Access denied",
        },
      },
    });
  }
}


test("other Recruit, unassigned Manager, and unknown targets are uniformly denied", async ({
  page,
}, testInfo) => {
  const suffix = `denied-${testInfo.project.name}`;
  const fixtures = await setupManagedRecruit(page, suffix);
  const seed = await page.evaluate(async (ownerId) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: ownerId,
        date: "2026-07-16",
        title: "Protected task",
        description: "",
        category: "Training",
        status: "Not Started",
        priority: "Medium",
      }),
    });
    return response.json();
  }, fixtures.recruit.id);

  await logout(page);
  await login(page, fixtures.otherRecruit.email, "browser-password");
  expectUniformDenial(
    await resourceProbe(page, "tasks", fixtures.recruit.id, seed.id),
  );
  expectUniformDenial(
    await resourceProbe(page, "issues", fixtures.recruit.id, seed.id),
  );

  await logout(page);
  await login(page, fixtures.unassignedManager.email, "browser-password");
  expectUniformDenial(
    await resourceProbe(page, "tasks", fixtures.recruit.id, seed.id),
  );
  expectUniformDenial(
    await resourceProbe(page, "issues", fixtures.recruit.id, seed.id),
  );

  await logout(page);
  await login(page, "admin@example.com", "bootstrap-password");
  expectUniformDenial(await resourceProbe(page, "tasks", 999999, 999999));
  expectUniformDenial(await resourceProbe(page, "issues", 999999, 999999));

  const protectedTask = await page.evaluate(async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  }, seed.id);
  expect(protectedTask.status).toBe(200);
  expect(protectedTask.body.title).toBe("Protected task");
});
