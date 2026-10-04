import { test, expect, Page } from "@playwright/test";
import {
  ACCOUNTS, INITIAL_PASSWORD, login, logout, uniqueEmail, shot, createUserViaApi,
} from "./helpers";

// E2E-03. Requires the client on :5173, the server on :3000 and the seeded dev data.
async function openUserManagement(page: Page) {
  await login(page, ACCOUNTS.admin);
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

// Narrows the list to one account so Edit buttons from other parallel runs never interfere.
async function searchFor(page: Page, text: string) {
  await page.getByLabel("Search users").fill(text);
  await page.getByRole("button", { name: "Search", exact: true }).click();
}

test.describe("User administration", () => {
  test("Administrator creates, searches, edits and deactivates a user", async ({ page }, testInfo) => {
    const email = uniqueEmail("created");
    await openUserManagement(page);
    await shot(page, testInfo, "user-management", "list");

    await page.getByRole("button", { name: /\+ Create User/ }).click();
    await page.getByLabel("Full name").fill("E2E Created User");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Role", { exact: true }).selectOption("IT_STAFF");
    await page.getByLabel("Initial password").fill(INITIAL_PASSWORD);
    await shot(page, testInfo, "user-management", "create-panel");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByText(/User E2E Created User created/)).toBeVisible();

    await searchFor(page, email);
    await expect(page.getByText(email).filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit E2E Created User" }).click();
    await page.getByLabel("Full name").fill("E2E Renamed User");
    await page.getByRole("button", { name: "Save User" }).click();
    await expect(page.getByText("User saved.")).toBeVisible();
    await shot(page, testInfo, "user-management", "edit-panel");

    await page.getByRole("button", { name: "Deactivate User" }).click();
    await expect(page.getByText("User deactivated.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reactivate User" })).toBeEnabled();
  });

  test("a duplicate email is rejected with a field-level message", async ({ page, request }, testInfo) => {
    const email = uniqueEmail("dup");
    await createUserViaApi(request, { email });
    await openUserManagement(page);

    await page.getByRole("button", { name: /\+ Create User/ }).click();
    await page.getByLabel("Full name").fill("E2E Duplicate");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Initial password").fill(INITIAL_PASSWORD);
    await page.getByRole("button", { name: "Save User" }).click();

    await expect(page.getByText(/already in use/i)).toBeVisible();
    await shot(page, testInfo, "user-management", "duplicate-email");
  });

  test("the Administrator cannot deactivate their own account", async ({ page }) => {
    await openUserManagement(page);
    await searchFor(page, ACCOUNTS.admin);
    await page.getByRole("button", { name: "Edit John Smith" }).click();

    await expect(page.getByRole("button", { name: "Deactivate User" })).toBeDisabled();
    await expect(page.getByText(/You cannot deactivate your own account/i)).toBeVisible();
  });

  test("a new initial password must be changed at the user's next login", async ({ page, request }, testInfo) => {
    const email = uniqueEmail("reset");
    await createUserViaApi(request, { email, name: "E2E Reset Target" });
    await openUserManagement(page);

    await searchFor(page, email);
    await page.getByRole("button", { name: "Edit E2E Reset Target" }).click();
    await page.getByRole("button", { name: "Set New Initial Password" }).click();
    await page.getByLabel("New initial password").fill("Another#Pass2");
    await page.getByRole("button", { name: "Confirm New Password" }).click();
    await expect(page.getByText(/must change it at next login/i)).toBeVisible();
    await shot(page, testInfo, "user-management", "new-initial-password");
    await logout(page);

    await login(page, email, "Another#Pass2");
    await expect(page).toHaveURL(/\/change-password$/);
  });

  test("a Requester has no Admin link and is refused on the direct URL", async ({ page }) => {
    await login(page, ACCOUNTS.requester);
    // Wait for the login to finish (session cookie set) before asserting or reloading the page.
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByRole("link", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page.getByText(/You don't have permission to view this/i)).toBeVisible();
  });
});
