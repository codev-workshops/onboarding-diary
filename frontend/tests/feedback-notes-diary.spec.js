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


async function exerciseFeedbackUi(page, subject, recruitName) {
  await page.getByRole("button", { name: "Feedback" }).click();
  await expect(
    page.getByRole("heading", { name: "Feedback", exact: true }),
  ).toBeVisible();
  if (recruitName) {
    await page.getByLabel("Recruit").selectOption({ label: recruitName });
  }
  await page.getByLabel("Feedback date").fill("2026-07-16");
  await page.getByLabel("Feedback subject").fill(subject);
  await page.getByLabel("Feedback details").fill("The onboarding flow was clear.");
  await page.getByLabel("Feedback type").selectOption("Positive");
  await page.getByRole("button", { name: "Create Feedback" }).click();
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Feedback created");

  await page.getByRole("button", { name: `Edit ${subject}` }).click();
  await page.getByLabel("Feedback type").selectOption("Concern");
  await page.getByRole("button", { name: "Save Feedback" }).click();
  await expect(page.getByRole("status")).toHaveText("Feedback saved");
  await expect(
    page
      .getByLabel("Feedback list")
      .getByText("Concern", { exact: true }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${subject}` }).click();
  await expect(page.getByRole("status")).toHaveText("Feedback deleted");
  await expect(page.getByRole("heading", { name: subject })).toHaveCount(0);
}


async function exerciseNoteUi(page, title, recruitName) {
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
  if (recruitName) {
    await page.getByLabel("Recruit").selectOption({ label: recruitName });
  }
  await page.getByLabel("Note date").fill("2026-07-16");
  await page.getByLabel("Note title").fill(title);
  await page.getByLabel("Note content").fill("Review the deployment checklist.");
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note tag 1").fill(" Release ");
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note tag 2").fill("TEAM");
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note tag 3").fill("release");
  await page.getByRole("button", { name: "Create Note" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Note created");
  await expect(page.getByText("release, team", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByRole("button", { name: "Remove tag 1" }).click();
  await page.getByLabel("Note tag 1").fill("Updated");
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note tag 2").fill("Follow Up");
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  await expect(page.getByText("updated, follow up", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByRole("status")).toHaveText("Note deleted");
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
}


test("Recruit maintains feedback and notes", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name;
  const email = `feedback-note-recruit-${suffix}@example.com`;
  await signupRecruit(page, email, `Feedback Note Recruit ${suffix}`);
  await login(page, email);
  await exerciseFeedbackUi(page, `Recruit feedback ${suffix}`);
  await exerciseNoteUi(page, `Recruit note ${suffix}`);
});


test("assigned Manager maintains recruit feedback and notes", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const recruitName = `Managed Feedback Recruit ${suffix}`;
  const recruit = await signupRecruit(
    page,
    `feedback-managed-${suffix}@example.com`,
    recruitName,
  );
  await login(page, "admin@example.com", "bootstrap-password");
  const manager = await adminCreateUser(page, {
    email: `feedback-manager-${suffix}@example.com`,
    name: `Feedback Manager ${suffix}`,
    role: "Manager",
  });
  await assignManager(page, recruit.id, manager.id);
  await logout(page);

  await login(page, manager.email);
  await exerciseFeedbackUi(page, `Manager feedback ${suffix}`, recruitName);
  await exerciseNoteUi(page, `Manager note ${suffix}`, recruitName);
});


test("Admin maintains feedback and notes for any recruit", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const recruitName = `Admin Feedback Recruit ${suffix}`;
  await signupRecruit(
    page,
    `feedback-admin-target-${suffix}@example.com`,
    recruitName,
  );
  await login(page, "admin@example.com", "bootstrap-password");
  await exerciseFeedbackUi(page, `Admin feedback ${suffix}`, recruitName);
  await exerciseNoteUi(page, `Admin note ${suffix}`, recruitName);
});


test("post-create reload failures do not show false confirmations", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const email = `feedback-note-reload-${suffix}@example.com`;
  await signupRecruit(page, email, `Reload Recruit ${suffix}`);
  await login(page, email);

  await page.getByRole("button", { name: "Feedback" }).click();
  await expect(
    page.getByRole("heading", { name: "Feedback", exact: true }),
  ).toBeVisible();
  await page.route("**/api/feedback?*", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Feedback reload failed" } }),
    });
  });
  await page.getByLabel("Feedback date").fill("2026-07-16");
  await page.getByLabel("Feedback subject").fill(`Reload feedback ${suffix}`);
  await page.getByLabel("Feedback details").fill("Persist this feedback.");
  await page.getByRole("button", { name: "Create Feedback" }).click();
  await expect(page.getByRole("status")).toHaveText("Feedback reload failed");
  await expect(page.getByRole("status")).not.toHaveText("Feedback created");
  await page.unroute("**/api/feedback?*");

  await page.getByRole("button", { name: "Notes" }).click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
  await page.route("**/api/notes?*", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Notes reload failed" } }),
    });
  });
  await page.getByLabel("Note date").fill("2026-07-16");
  await page.getByLabel("Note title").fill(`Reload note ${suffix}`);
  await page.getByLabel("Note content").fill("Persist this note.");
  await page.getByRole("button", { name: "Create Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Notes reload failed");
  await expect(page.getByRole("status")).not.toHaveText("Note created");
});


test("note tag editor round-trips commas and supports zero to ten tags", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const email = `comma-tag-${suffix}@example.com`;
  const recruit = await signupRecruit(page, email, `Comma Tag Recruit ${suffix}`);
  await login(page, email);

  const note = await page.evaluate(async (ownerId) => {
    const response = await fetch("/api/notes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: ownerId,
        date: "2026-07-16",
        title: "Comma tag note",
        content: "Round-trip every backend-valid tag.",
        tags: ["a,b"],
      }),
    });
    return response.json();
  }, recruit.id);

  let listLoads = 0;
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      request.url().includes("/api/notes?")
    ) {
      listLoads += 1;
    }
  });
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByRole("heading", { name: "Comma tag note" })).toBeVisible();
  const initialListLoads = listLoads;

  await page.getByRole("button", { name: "Edit Comma tag note" }).click();
  await expect(page.getByLabel("Note tag 1")).toHaveValue("a,b");
  await expect(page.getByLabel(/^Note tag /)).toHaveCount(1);
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note tag 2").fill("temporary");
  await page.getByRole("button", { name: "Remove tag 2" }).click();
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  expect(listLoads).toBe(initialListLoads + 1);

  let saved = await page.evaluate(async (noteId) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      credentials: "same-origin",
    });
    return response.json();
  }, note.id);
  expect(saved.tags).toEqual(["a,b"]);

  await page.getByRole("button", { name: "Edit Comma tag note" }).click();
  await expect(page.getByLabel("Note tag 1")).toHaveValue("a,b");
  await page.screenshot({
    path: testInfo.outputPath("comma-tag-roundtrip.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Remove tag 1" }).click();
  await expect(page.getByText("No tags added.")).toBeVisible();
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  saved = await page.evaluate(async (noteId) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      credentials: "same-origin",
    });
    return response.json();
  }, note.id);
  expect(saved.tags).toEqual([]);

  await page.getByRole("button", { name: "Edit Comma tag note" }).click();
  for (let index = 1; index <= 10; index += 1) {
    await page.getByRole("button", { name: "Add tag" }).click();
    await page.getByLabel(`Note tag ${index}`).fill(` Tag ${index} `);
  }
  await expect(page.getByRole("button", { name: "Add tag" })).toBeDisabled();
  await page.getByLabel("Note tag 10").fill("x".repeat(31));
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(
    page.getByText("Each tag must be between 1 and 30 characters"),
  ).toBeVisible();
  await page.getByLabel("Note tag 10").fill(" Tag 10 ");
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  saved = await page.evaluate(async (noteId) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      credentials: "same-origin",
    });
    return response.json();
  }, note.id);
  expect(saved.tags).toEqual(
    Array.from({ length: 10 }, (_, index) => `tag ${index + 1}`),
  );
});


test("note tag editor preserves embedded newlines", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const email = `newline-tag-${suffix}@example.com`;
  const recruit = await signupRecruit(page, email, `Newline Tag Recruit ${suffix}`);
  await login(page, email);

  const note = await page.evaluate(async (ownerId) => {
    const response = await fetch("/api/notes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: ownerId,
        date: "2026-07-16",
        title: "Newline tag note",
        content: "Round-trip an embedded newline.",
        tags: ["line\nbreak"],
      }),
    });
    return response.json();
  }, recruit.id);

  await page.getByRole("button", { name: "Notes" }).click();
  await page.getByRole("button", { name: "Edit Newline tag note" }).click();
  const tag = page.getByLabel("Note tag 1");
  await expect(tag).toHaveValue("line\nbreak");
  await expect(page.getByLabel(/^Note tag /)).toHaveCount(1);
  await tag.press("End");
  await tag.type("!");
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");

  const saved = await page.evaluate(async (noteId) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      credentials: "same-origin",
    });
    return response.json();
  }, note.id);
  expect(saved.tags).toEqual(["line\nbreak!"]);
});


function payloadFor(resource, ownerId) {
  return resource === "feedback"
    ? {
        owner_id: ownerId,
        date: "2026-07-16",
        subject: "Denied feedback",
        type: "Suggestion",
        details: "This request should be denied.",
      }
    : {
        owner_id: ownerId,
        date: "2026-07-16",
        title: "Denied note",
        content: "This request should be denied.",
        tags: ["denied"],
      };
}


async function createApiEntry(page, resource, ownerId) {
  const result = await page.evaluate(
    async ({ resource: targetResource, ownerId: targetOwner }) => {
      const payload =
        targetResource === "feedback"
          ? {
              owner_id: targetOwner,
              date: "2026-07-16",
              subject: "Protected feedback",
              type: "Positive",
              details: "Protected feedback details.",
            }
          : {
              owner_id: targetOwner,
              date: "2026-07-16",
              title: "Protected note",
              content: "Protected note content.",
              tags: ["protected"],
            };
      const response = await fetch(`/api/${targetResource}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { status: response.status, body: await response.json() };
    },
    { resource, ownerId },
  );
  expect(result.status).toBe(201);
  return result.body;
}


async function resourceProbe(page, resource, ownerId, recordId) {
  return page.evaluate(
    async ({
      resource: targetResource,
      ownerId: targetOwner,
      recordId: targetRecord,
      createPayload,
    }) => {
      async function request(path, options) {
        const response = await fetch(path, {
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          ...options,
        });
        return {
          status: response.status,
          body: response.status === 204 ? null : await response.json(),
        };
      }
      const patchPayload =
        targetResource === "feedback"
          ? { subject: "Tampered feedback" }
          : { title: "Tampered note" };
      return {
        list: await request(
          `/api/${targetResource}?owner_id=${targetOwner}`,
        ),
        get: await request(`/api/${targetResource}/${targetRecord}`),
        create: await request(`/api/${targetResource}`, {
          method: "POST",
          body: JSON.stringify(createPayload),
        }),
        patch: await request(`/api/${targetResource}/${targetRecord}`, {
          method: "PATCH",
          body: JSON.stringify(patchPayload),
        }),
        delete: await request(`/api/${targetResource}/${targetRecord}`, {
          method: "DELETE",
        }),
      };
    },
    {
      resource,
      ownerId,
      recordId,
      createPayload: payloadFor(resource, ownerId),
    },
  );
}


function expectUniformDenial(result) {
  for (const operation of Object.values(result)) {
    expect(operation.status).toBe(403);
    expect(operation.body).toEqual({
      error: { code: "access_denied", message: "Access denied" },
    });
  }
}


test("feedback and note request matrices deny out-of-scope and unknown targets", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const recruit = await signupRecruit(
    page,
    `denial-recruit-${suffix}@example.com`,
    `Denial Recruit ${suffix}`,
  );
  const other = await signupRecruit(
    page,
    `denial-other-${suffix}@example.com`,
    `Denial Other ${suffix}`,
  );
  await login(page, "admin@example.com", "bootstrap-password");
  const assignedManager = await adminCreateUser(page, {
    email: `denial-assigned-${suffix}@example.com`,
    name: `Denial Assigned ${suffix}`,
    role: "Manager",
  });
  const unassignedManager = await adminCreateUser(page, {
    email: `denial-unassigned-${suffix}@example.com`,
    name: `Denial Unassigned ${suffix}`,
    role: "Manager",
  });
  await assignManager(page, recruit.id, assignedManager.id);
  const feedback = await createApiEntry(page, "feedback", recruit.id);
  const note = await createApiEntry(page, "notes", recruit.id);
  const otherFeedback = await createApiEntry(page, "feedback", other.id);
  const otherNote = await createApiEntry(page, "notes", other.id);
  await logout(page);

  await login(page, other.email);
  expectUniformDenial(
    await resourceProbe(page, "feedback", recruit.id, feedback.id),
  );
  expectUniformDenial(
    await resourceProbe(page, "notes", recruit.id, note.id),
  );
  await logout(page);

  await login(page, unassignedManager.email);
  expectUniformDenial(
    await resourceProbe(page, "feedback", recruit.id, feedback.id),
  );
  expectUniformDenial(
    await resourceProbe(page, "notes", recruit.id, note.id),
  );
  await logout(page);

  await login(page, assignedManager.email);
  expectUniformDenial(
    await resourceProbe(page, "feedback", other.id, otherFeedback.id),
  );
  expectUniformDenial(
    await resourceProbe(page, "notes", other.id, otherNote.id),
  );
  expectUniformDenial(await resourceProbe(page, "feedback", 999999, 999999));
  expectUniformDenial(await resourceProbe(page, "notes", 999999, 999999));
  await logout(page);

  await login(page, "admin@example.com", "bootstrap-password");
  expectUniformDenial(await resourceProbe(page, "feedback", 999999, 999999));
  expectUniformDenial(await resourceProbe(page, "notes", 999999, 999999));
  const protectedFeedback = await page.evaluate(async (feedbackId) => {
    const response = await fetch(`/api/feedback/${feedbackId}`, {
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  }, feedback.id);
  const protectedNote = await page.evaluate(async (noteId) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  }, note.id);
  expect(protectedFeedback.status).toBe(200);
  expect(protectedFeedback.body.subject).toBe("Protected feedback");
  expect(protectedNote.status).toBe(200);
  expect(protectedNote.body.title).toBe("Protected note");
});
