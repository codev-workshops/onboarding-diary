import { expect, test } from "@playwright/test";


test("signup, login, profile update, invalid login, and logout", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Email").fill("missing@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");

  await page.getByRole("button", { name: "Create a Recruit account" }).click();
  await page.getByLabel("Name").fill("Browser Recruit");
  await page.getByLabel("Email").fill("browser@example.com");
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Start date").fill("2026-07-15");
  await page.getByLabel("Password").fill("browser-password");
  const signupResponse = page.waitForResponse("**/api/auth/signup");
  await page.getByRole("button", { name: "Sign up" }).click();
  expect((await signupResponse).status()).toBe(201);

  await expect(page.getByLabel("Email")).toHaveValue("browser@example.com");
  await page.getByLabel("Password").fill("browser-password");
  const loginResponse = page.waitForResponse("**/api/auth/login");
  await page.getByRole("button", { name: "Log in" }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Welcome, Browser Recruit" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Profile" }).click();
  await expect(page.getByText("Role: Recruit")).toBeVisible();
  await page.getByLabel("Name").fill("Updated Browser Recruit");
  await page.getByLabel("Department").fill("Product");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved");

  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Updated Browser Recruit" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});


test("signup network failure remains visible and retryable", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Create a Recruit account" }).click();
  await page.getByLabel("Name").fill("Network Recruit");
  await page.getByLabel("Email").fill("signup-network@example.com");
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Start date").fill("2026-07-15");
  await page.getByLabel("Password").fill("network-password");
  await page.route("**/api/auth/signup", (route) =>
    route.abort("connectionfailed"),
  );

  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(
    page.getByRole("heading", { name: "Start your diary" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Unable to reach the server; please retry",
  );
  await expect(page.getByLabel("Email")).toHaveValue(
    "signup-network@example.com",
  );
  expect(pageErrors).toEqual([]);
});


test("profile network failure preserves the form and application", async ({
  page,
}) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const profile = {
    name: "Profile Network Recruit",
    email: "profile-network@example.com",
    department: "Engineering",
    start_date: "2026-07-15",
    password: "network-password",
  };
  expect(
    (
      await page.request.post("/api/auth/signup", {
        data: profile,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { email: profile.email, password: profile.password },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/");
  await page.getByRole("button", { name: "Profile" }).click();
  await page.getByLabel("Name").fill("Unsaved Network Recruit");
  await page.route("**/api/profile", (route) => {
    if (route.request().method() === "PATCH") {
      return route.abort("connectionfailed");
    }
    return route.continue();
  });

  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Unable to reach the server; please retry",
  );
  await expect(page.getByLabel("Name")).toHaveValue(
    "Unsaved Network Recruit",
  );
  expect(pageErrors).toEqual([]);
});
