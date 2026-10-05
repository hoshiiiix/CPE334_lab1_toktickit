import { Page, APIRequestContext, TestInfo, expect } from "@playwright/test";

// Local-development accounts created by `npm run prisma:seed` (see README, "Lab 3").
// These credentials are for local testing only and are never used in production.
export const PASSWORD = "DevPass123!";
export const INITIAL_PASSWORD = "Initial#Pass1";
export const ACCOUNTS = {
  requester: "jennifer.anderson@example.com",
  otherRequester: "michael.brown@example.com",
  staff: "emily.davis@example.com",
  admin: "john.smith@example.com",
};

const API = process.env.E2E_API_URL ?? "http://localhost:3000";

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

// Emails must be unique per run: the three Playwright projects share one database.
export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

export async function shot(page: Page, testInfo: TestInfo, folder: string, name: string) {
  await page.screenshot({
    path: `artifacts/lab-03/screenshots/${folder}/${testInfo.project.name.toLowerCase()}-${name}.png`,
    fullPage: true,
  });
}

// Creates a user through the API as the seeded Administrator (faster than the UI for set-up).
export async function createUserViaApi(
  request: APIRequestContext,
  input: { email: string; name?: string; role?: string; isActive?: boolean; initialPassword?: string }
) {
  const loginRes = await request.post(`${API}/api/auth/login`, {
    data: { email: ACCOUNTS.admin, password: PASSWORD },
  });
  expect(loginRes.ok()).toBeTruthy();

  const res = await request.post(`${API}/api/admin/users`, {
    data: {
      name: input.name ?? "E2E Test User",
      email: input.email,
      role: input.role ?? "REQUESTER",
      isActive: input.isActive ?? true,
      initialPassword: input.initialPassword ?? INITIAL_PASSWORD,
    },
  });
  expect(res.status()).toBe(201);
}
