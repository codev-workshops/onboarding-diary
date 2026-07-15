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
