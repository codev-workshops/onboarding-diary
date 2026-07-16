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


async function requestReport(page, recruitId) {
  return page.evaluate(async (targetId) => {
    const parameters = new URLSearchParams({
      recruit_id: String(targetId),
      type: "combined",
      start_date: "2026-07-15",
      end_date: "2026-07-16",
      format: "csv",
    });
    const response = await fetch(`/api/reports?${parameters}`, {
      credentials: "same-origin",
    });
    return {
      status: response.status,
      contentType: response.headers.get("Content-Type"),
      body: await response.text(),
    };
  }, recruitId);
}


async function downloadReport(
  page,
  { recruitName, type, format, startDate, endDate },
) {
  await page.getByRole("button", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  if (recruitName) {
    await page.getByLabel("Report Recruit").selectOption({ label: recruitName });
  }
  await page.getByLabel("Report type").selectOption(type);
  await page.getByLabel("Report format").selectOption(format);
  await page.getByLabel("Report start date").fill(startDate);
  await page.getByLabel("Report end date").fill(endDate);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const artifact = await download;
  await expect(page.getByRole("status")).toHaveText(
    `${format.toUpperCase()} report downloaded`,
  );
  return artifact;
}


async function downloadBytes(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}


function projectSuffix(testInfo) {
  return testInfo.project.name.replaceAll("-", "");
}


const accessDenied = {
  error: {
    code: "access_denied",
    message: "Access denied",
  },
};


test("Recruit downloads own CSV and receives no-leak denials", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  const recruit = await signupRecruit(
    page,
    `report-recruit-${suffix}@example.com`,
    `Report Recruit ${suffix}`,
  );
  const otherRecruit = await signupRecruit(
    page,
    `report-other-${suffix}@example.com`,
    `Report Other ${suffix}`,
  );
  await login(page, recruit.email);
  await createDiaryEntry(page, "tasks", recruit.id, {
    date: "2026-07-15",
    title: `Recruit report task ${suffix}`,
    description: "CSV report content",
    category: "Training",
    status: "In Progress",
    priority: "High",
  });

  const download = await downloadReport(page, {
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  expect(download.suggestedFilename()).toBe(
    `onboarding-diary-${recruit.id}-tasks-2026-07-15-to-2026-07-15.csv`,
  );
  const csv = (await downloadBytes(download)).toString("utf8");
  expect(csv).toContain(
    "date,title,description,category,status,priority\r\n",
  );
  expect(csv).toContain(`Recruit report task ${suffix}`);

  const existingDenial = await requestReport(page, otherRecruit.id);
  const unknownDenial = await requestReport(page, 999999);
  for (const denial of [existingDenial, unknownDenial]) {
    expect(denial.status).toBe(403);
    expect(denial.contentType).toContain("application/json");
    expect(JSON.parse(denial.body)).toEqual(accessDenied);
    expect(denial.body).not.toContain(`Report Other ${suffix}`);
    expect(denial.body).not.toContain(`Recruit report task ${suffix}`);
  }

  await page.route("**/api/reports?*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "server_error",
          message: "An unexpected error occurred; please retry",
        },
      }),
    }),
  );
  await page.getByRole("button", { name: "Download report" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "An unexpected error occurred; please retry",
  );
  await expect(page.getByLabel("Report start date")).toHaveValue("2026-07-15");
  await expect(page.getByLabel("Report end date")).toHaveValue("2026-07-15");
  await expect(page.getByRole("button", { name: "Download report" })).toBeEnabled();
});


test("assigned Manager downloads PDF and other targets are uniformly denied", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const recruit = await createUser(page, {
    email: `manager-report-recruit-${suffix}@example.com`,
    name: `Manager Report Recruit ${suffix}`,
    role: "Recruit",
  });
  const otherRecruit = await createUser(page, {
    email: `manager-report-other-${suffix}@example.com`,
    name: `Manager Report Other ${suffix}`,
    role: "Recruit",
  });
  const manager = await createUser(page, {
    email: `report-manager-${suffix}@example.com`,
    name: `Report Manager ${suffix}`,
    role: "Manager",
  });
  await assignManager(page, recruit.id, manager.id);
  await createDiaryEntry(page, "issues", recruit.id, {
    date: "2026-07-16",
    title: `Manager issue ${suffix}`,
    description: "PDF report content",
    severity: "High",
    status: "Open",
    resolution_notes: "",
  });
  await logout(page);
  await login(page, manager.email);

  const download = await downloadReport(page, {
    recruitName: recruit.name,
    type: "issues",
    format: "pdf",
    startDate: "2026-07-16",
    endDate: "2026-07-16",
  });
  expect(download.suggestedFilename()).toBe(
    `onboarding-diary-${recruit.id}-issues-2026-07-16-to-2026-07-16.pdf`,
  );
  const pdf = await downloadBytes(download);
  expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
  expect(pdf.toString("latin1")).toContain("Onboarding Diary Report");
  expect(pdf.toString("latin1")).toContain("Manager issue");
  expect(pdf.toString("latin1")).toContain(suffix);

  const existingDenial = await requestReport(page, otherRecruit.id);
  const unknownDenial = await requestReport(page, 999999);
  for (const denial of [existingDenial, unknownDenial]) {
    expect(denial.status).toBe(403);
    expect(JSON.parse(denial.body)).toEqual(accessDenied);
    expect(denial.body).not.toContain(`Manager Report Other ${suffix}`);
    expect(denial.body).not.toContain(`Manager issue ${suffix}`);
  }
});


test("Admin downloads any Recruit report including an empty artifact", async ({
  page,
}, testInfo) => {
  const suffix = projectSuffix(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const recruit = await createUser(page, {
    email: `admin-report-recruit-${suffix}@example.com`,
    name: `Admin Report Recruit ${suffix}`,
    role: "Recruit",
  });
  await createDiaryEntry(page, "feedback", recruit.id, {
    date: "2026-07-15",
    subject: `Admin report feedback ${suffix}`,
    type: "Positive",
    details: "Authorized Admin content",
  });

  const populated = await downloadReport(page, {
    recruitName: recruit.name,
    type: "combined",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  expect(populated.suggestedFilename()).toBe(
    `onboarding-diary-${recruit.id}-combined-2026-07-15-to-2026-07-15.csv`,
  );
  expect((await downloadBytes(populated)).toString("utf8")).toContain(
    `Admin report feedback ${suffix}`,
  );

  const empty = await downloadReport(page, {
    recruitName: recruit.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
  });
  expect((await downloadBytes(empty)).toString("utf8")).toBe(
    "date,title,description,category,status,priority\r\n",
  );

  const unknownDenial = await requestReport(page, 999999);
  expect(unknownDenial.status).toBe(403);
  expect(JSON.parse(unknownDenial.body)).toEqual(accessDenied);
});
