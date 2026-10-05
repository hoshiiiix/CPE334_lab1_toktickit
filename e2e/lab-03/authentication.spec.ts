import { test, expect } from "@playwright/test";
import {
  ACCOUNTS, INITIAL_PASSWORD, login, logout, uniqueEmail, shot, createUserViaApi,
} from "./helpers";

// E2E-01 / E2E-04. Requires the client on :5173, the server on :3000 and the seeded dev data.
test.describe("Authentication", () => {
  test("invalid credentials show a safe error and keep the user on the login page", async ({ page }, testInfo) => {
    await login(page, uniqueEmail("nobody"), "Wrong#Pass1");
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await shot(page, testInfo, "authentication", "login-error");
  });

  test("an inactive account gets the same generic message", async ({ page, request }) => {
    const email = uniqueEmail("inactive");
    await createUserViaApi(request, { email, isActive: false });

    await login(page, email, INITIAL_PASSWORD);
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("first login with an initial password forces a password change before the app opens", async ({ page, request }, testInfo) => {
    const email = uniqueEmail("firstlogin");
    await createUserViaApi(request, { email, name: "E2E First Login" });

    await login(page, email, INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/change-password$/);
    await shot(page, testInfo, "authentication", "change-password");

    // The normal application stays unavailable until a valid new password is saved (AC-02).
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/change-password$/);

    await page.getByLabel("Current (temporary) password").fill(INITIAL_PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("Brand#NewPass9");
    await page.getByLabel("Confirm new password").fill("Brand#NewPass9");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByText("E2E First Login")).toBeVisible();
    await shot(page, testInfo, "authentication", "after-first-login");
  });

  test("logout removes access: a protected URL returns to the login page", async ({ page }) => {
    await login(page, ACCOUNTS.requester);
    await expect(page).toHaveURL(/\/tickets$/);

    await logout(page);
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation shows only the destinations allowed for each role", async ({ page }, testInfo) => {
    const my = (name: string) => page.getByRole("link", { name, exact: true });

    await login(page, ACCOUNTS.requester);
    await expect(my("My Tickets")).toBeVisible();
    await expect(my("My Queue")).toHaveCount(0);
    await expect(my("Admin")).toHaveCount(0);
    await shot(page, testInfo, "authentication", "nav-requester");
    await logout(page);

    await login(page, ACCOUNTS.staff);
    await expect(my("My Queue")).toBeVisible();
    await expect(my("Admin")).toHaveCount(0);
    await logout(page);

    await login(page, ACCOUNTS.admin);
    await expect(my("Admin")).toBeVisible();
  });
});
