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


function testSlug(testInfo) {
  return `${projectSuffix(testInfo)}-${testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)}`;
}


async function createAdminReportFixture(page, testInfo) {
  const suffix = testSlug(testInfo);
  await login(page, "admin@example.com", "bootstrap-password");
  const recruitA = await createUser(page, {
    email: `gf-recruit-a-${suffix}@example.com`,
    name: `GF Recruit A ${suffix}`,
    role: "Recruit",
  });
  const recruitB = await createUser(page, {
    email: `gf-recruit-b-${suffix}@example.com`,
    name: `GF Recruit B ${suffix}`,
    role: "Recruit",
  });
  await createDiaryEntry(page, "tasks", recruitA.id, {
    date: "2026-07-15",
    title: `Obsolete task ${suffix}`,
    description: "stale CSV content",
    category: "Training",
    status: "In Progress",
    priority: "High",
  });
  await createDiaryEntry(page, "feedback", recruitB.id, {
    date: "2026-08-01",
    subject: `Current feedback ${suffix}`,
    type: "Positive",
    details: "current PDF content",
  });
  return { recruitA, recruitB, suffix };
}


async function openReportForm(page, { recruitName, type, format, startDate, endDate }) {
  await page.getByRole("button", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await page.getByLabel("Report Recruit").selectOption({ label: recruitName });
  await page.getByLabel("Report type").selectOption(type);
  await page.getByLabel("Report format").selectOption(format);
  await page.getByLabel("Report start date").fill(startDate);
  await page.getByLabel("Report end date").fill(endDate);
}


async function installObjectUrlTracker(page) {
  await page.addInitScript(() => {
    window.__reportObjectUrls = { created: [], revoked: [] };
    const createObjectUrl = URL.createObjectURL.bind(URL);
    const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createObjectUrl(blob);
      window.__reportObjectUrls.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.__reportObjectUrls.revoked.push(url);
      return revokeObjectUrl(url);
    };
  });
}


async function readObjectUrlTracker(page) {
  return page.evaluate(() => window.__reportObjectUrls);
}


async function delayReport(page, expected, responseOverride) {
  let release;
  let resolveSeen;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  const seen = new Promise((resolve) => {
    resolveSeen = resolve;
  });
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  let matched = false;
  await page.route("**/api/reports?*", async (route) => {
    const url = new URL(route.request().url());
    const matches = Object.entries(expected).every(
      ([key, value]) => url.searchParams.get(key) === String(value),
    );
    if (!matched && matches) {
      matched = true;
      resolveSeen(url);
      await released;
      try {
        if (responseOverride) {
          await route.fulfill(responseOverride);
          return;
        }
        const response = await route.fetch();
        await route.fulfill({ response });
      } catch {
        try {
          await route.abort();
        } catch (abortError) {
          void abortError;
        }
      } finally {
        resolveDone();
      }
      return;
    }
    await route.continue();
  });
  return { done, release, seen };
}


async function expectNoDownload(downloadPromise) {
  await expect(downloadPromise).resolves.toBeNull();
}


async function waitForNoDownload(page, timeout = 1500) {
  return page
    .waitForEvent("download", { timeout })
    .then((download) => download)
    .catch(() => null);
}


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


test("stale delayed report success is ignored after owner format and range changes", async ({
  page,
}, testInfo) => {
  await installObjectUrlTracker(page);
  const { recruitA, recruitB } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  const delayed = await delayReport(page, {
    recruit_id: recruitA.id,
    type: "tasks",
    format: "csv",
    start_date: "2026-07-15",
    end_date: "2026-07-15",
  });
  const noDownload = waitForNoDownload(page);
  await page.getByRole("button", { name: "Download report" }).click();
  await delayed.seen;
  await page.getByLabel("Report Recruit").selectOption({ label: recruitB.name });
  await page.getByLabel("Report type").selectOption("combined");
  await page.getByLabel("Report format").selectOption("pdf");
  await page.getByLabel("Report start date").fill("2026-08-01");
  await page.getByLabel("Report end date").fill("2026-08-02");
  delayed.release();
  await delayed.done;
  await expectNoDownload(noDownload);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download report" })).toBeEnabled();
  expect((await readObjectUrlTracker(page)).created).toHaveLength(0);
});


test("stale delayed report errors do not overwrite current criteria state", async ({
  page,
}, testInfo) => {
  const { recruitA, recruitB } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  const delayed = await delayReport(
    page,
    {
      recruit_id: recruitA.id,
      type: "tasks",
      format: "csv",
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    },
    {
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "server_error",
          message: "An unexpected error occurred; please retry",
        },
      }),
    },
  );
  await page.getByRole("button", { name: "Download report" }).click();
  await delayed.seen;
  await page.getByLabel("Report Recruit").selectOption({ label: recruitB.name });
  await page.getByLabel("Report start date").fill("2026-08-01");
  await page.getByLabel("Report end date").fill("2026-08-02");
  delayed.release();
  await delayed.done;
  await expect(page.getByRole("button", { name: "Download report" })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Report Recruit")).toHaveValue(String(recruitB.id));
  await expect(page.getByLabel("Report start date")).toHaveValue("2026-08-01");
  await expect(page.getByLabel("Report end date")).toHaveValue("2026-08-02");
});


test("newer report download supersedes a delayed stale request", async ({
  page,
}, testInfo) => {
  await installObjectUrlTracker(page);
  const { recruitA, recruitB } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  const delayed = await delayReport(page, {
    recruit_id: recruitA.id,
    type: "tasks",
    format: "csv",
    start_date: "2026-07-15",
    end_date: "2026-07-15",
  });
  await page.getByRole("button", { name: "Download report" }).click();
  await delayed.seen;
  await page.getByLabel("Report Recruit").selectOption({ label: recruitB.name });
  await page.getByLabel("Report type").selectOption("combined");
  await page.getByLabel("Report format").selectOption("pdf");
  await page.getByLabel("Report start date").fill("2026-08-01");
  await page.getByLabel("Report end date").fill("2026-08-02");
  const currentDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const artifact = await currentDownload;
  expect(artifact.suggestedFilename()).toBe(
    `onboarding-diary-${recruitB.id}-combined-2026-08-01-to-2026-08-02.pdf`,
  );
  const pdf = (await downloadBytes(artifact)).toString("latin1");
  expect(pdf).toContain("Current feedback");
  expect(pdf).toContain(`Recruit: ${recruitB.name}`);
  const staleDownload = waitForNoDownload(page);
  delayed.release();
  await delayed.done;
  await expectNoDownload(staleDownload);
  await expect(page.getByRole("status")).toHaveText("PDF report downloaded");
  await page.waitForFunction(
    () =>
      window.__reportObjectUrls.created.length ===
      window.__reportObjectUrls.revoked.length,
  );
});


test("navigation cancels a pending report without stale download or state writes", async ({
  page,
}, testInfo) => {
  const { recruitA } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  const delayed = await delayReport(page, {
    recruit_id: recruitA.id,
    type: "tasks",
    format: "csv",
    start_date: "2026-07-15",
    end_date: "2026-07-15",
  });
  const noDownload = waitForNoDownload(page);
  await page.getByRole("button", { name: "Download report" }).click();
  await delayed.seen;
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Bootstrap Admin" }),
  ).toBeVisible();
  delayed.release();
  await delayed.done;
  await expectNoDownload(noDownload);
  await expect(page.getByText("CSV report downloaded")).toHaveCount(0);
});


test("stale 401 is ignored but current 401 clears the session", async ({
  page,
}, testInfo) => {
  const { recruitA } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  const delayed = await delayReport(
    page,
    {
      recruit_id: recruitA.id,
      type: "tasks",
      format: "csv",
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    },
    {
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "unauthorized", message: "Authentication required" },
      }),
    },
  );
  await page.getByRole("button", { name: "Download report" }).click();
  await delayed.seen;
  await page.getByLabel("Report end date").fill("2026-07-16");
  delayed.release();
  await delayed.done;
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

  await page.unroute("**/api/reports?*");
  await page.route("**/api/reports?*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "unauthorized", message: "Authentication required" },
      }),
    }),
  );
  await page.getByRole("button", { name: "Download report" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});


test("current report failure is retryable and preserves filename and content on retry", async ({
  page,
}, testInfo) => {
  const { recruitA, suffix } = await createAdminReportFixture(page, testInfo);
  await openReportForm(page, {
    recruitName: recruitA.name,
    type: "tasks",
    format: "csv",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
  });
  let failed = false;
  await page.route("**/api/reports?*", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "server_error",
            message: "An unexpected error occurred; please retry",
          },
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Download report" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "An unexpected error occurred; please retry",
  );
  await expect(page.getByLabel("Report start date")).toHaveValue("2026-07-15");
  await expect(page.getByLabel("Report end date")).toHaveValue("2026-07-15");
  await expect(page.getByRole("button", { name: "Download report" })).toBeEnabled();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toBe(
    `onboarding-diary-${recruitA.id}-tasks-2026-07-15-to-2026-07-15.csv`,
  );
  expect((await downloadBytes(artifact)).toString("utf8")).toContain(
    `Obsolete task ${suffix}`,
  );
  await expect(page.getByRole("status")).toHaveText("CSV report downloaded");
});
