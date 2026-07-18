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
}


test("User cards start folded showing only name and role, and toggle open/closed", async ({
  page,
}, testInfo) => {
  const suffix = testInfo.project.name;
  const recruitName = `Foldable Recruit ${suffix}`;
  const recruitEmail = `foldable-${suffix}@example.com`;

  await login(page, "admin@example.com", "bootstrap-password");
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  await createUser(page, {
    name: recruitName,
    email: recruitEmail,
    role: "Recruit",
  });

  const card = page.locator("article").filter({ hasText: recruitName });
  const toggle = card.getByRole("button", { name: new RegExp(recruitName) });

  // Folded by default: name + role visible, full details hidden.
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText(recruitName);
  await expect(toggle).toContainText("Recruit");
  await expect(card.getByText(recruitEmail, { exact: false })).toHaveCount(0);
  await expect(card.getByRole("button", { name: /Save user/ })).toHaveCount(0);
  await expect(
    card.getByLabel(/Manager assignment for user/),
  ).toHaveCount(0);

  // Expanding reveals the full details and editing controls.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByLabel(/Email for user/)).toHaveValue(recruitEmail);
  await expect(
    card.getByRole("button", { name: /Save user/ }),
  ).toBeVisible();
  await expect(
    card.getByLabel(/Manager assignment for user/),
  ).toBeVisible();

  // Collapsing hides the details again.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(card.getByText(recruitEmail, { exact: false })).toHaveCount(0);
  await expect(card.getByRole("button", { name: /Save user/ })).toHaveCount(0);
});


test("Each user card folds independently", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name;
  const firstName = `Independent One ${suffix}`;
  const secondName = `Independent Two ${suffix}`;

  await login(page, "admin@example.com", "bootstrap-password");
  await page.getByRole("button", { name: "Users & Assignments" }).click();
  await createUser(page, {
    name: firstName,
    email: `independent-one-${suffix}@example.com`,
    role: "Manager",
  });
  await createUser(page, {
    name: secondName,
    email: `independent-two-${suffix}@example.com`,
    role: "Recruit",
  });

  const firstCard = page.locator("article").filter({ hasText: firstName });
  const secondCard = page.locator("article").filter({ hasText: secondName });
  const firstToggle = firstCard.getByRole("button", {
    name: new RegExp(firstName),
  });
  const secondToggle = secondCard.getByRole("button", {
    name: new RegExp(secondName),
  });

  await firstToggle.click();
  await expect(firstToggle).toHaveAttribute("aria-expanded", "true");
  await expect(secondToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    firstCard.getByRole("button", { name: /Save user/ }),
  ).toBeVisible();
  await expect(
    secondCard.getByRole("button", { name: /Save user/ }),
  ).toHaveCount(0);
});
