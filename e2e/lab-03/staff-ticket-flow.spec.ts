import { test, expect } from "@playwright/test";
import { ACCOUNTS, login, logout, shot } from "./helpers";

// E2E-02. Requires the client on :5173, the server on :3000 and the seeded dev data.
test("Requester files a ticket, IT Staff works it, Requester sees only the public side", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const summary = `E2E staff flow ${Date.now()} ${testInfo.project.name}`;
  const publicText = `Public update ${Date.now()}`;
  const privateText = `Private note ${Date.now()}`;

  // 1. Requester creates the ticket.
  await login(page, ACCOUNTS.requester);
  await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
  await page.getByLabel(/Category/i).selectOption({ index: 1 });
  await page.getByLabel(/Related System/i).selectOption({ index: 1 });
  await page.getByLabel(/Ticket Summary/i).fill(summary);
  await page.getByLabel(/Description/i).fill("Staff flow E2E description with enough detail to submit.");
  await page.getByRole("button", { name: /Submit Ticket/i }).click();
  await expect(page.getByText(/TKT-\d{4}-\d{6}/).first()).toBeVisible();
  const ticketNumber = (await page.getByText(/TKT-\d{4}-\d{6}/).first().textContent())!
    .match(/TKT-\d{4}-\d{6}/)![0];
  await logout(page);

  // 2. IT Staff finds it in the queue and opens the detail.
  await login(page, ACCOUNTS.staff);
  await expect(page).toHaveURL(/\/queue$/);
  await page.getByLabel("Search tickets").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await shot(page, testInfo, "staff-queue", "search-result");
  await page.getByRole("link", { name: new RegExp(ticketNumber) }).first().click();
  await expect(page).toHaveURL(/\/queue\/\d+$/);

  // 3. Claim, priority, status.
  await page.getByLabel("Ticket Owner").selectOption({ label: "Emily Davis (IT Staff)" });
  await expect(page.getByLabel("Ticket Owner")).not.toHaveValue("");
  await page.getByLabel("IT Priority").selectOption("HIGH");
  await expect(page.getByLabel("IT Priority")).toHaveValue("HIGH");
  await page.getByLabel("Current Status").selectOption({ label: "OPEN" });
  await expect(page.getByLabel("Current Status").locator("option").first()).toHaveText(/OPEN \(current\)/);

  // 4. A public comment and a private internal note, kept in separate panels.
  const publicCard = page.locator("div.card", { has: page.getByRole("heading", { name: /Public Comments/ }) });
  const internalCard = page.locator("div.card", { has: page.getByRole("heading", { name: /Internal Notes/ }) });
  await publicCard.getByPlaceholder("Add a public comment…").fill(publicText);
  await publicCard.getByRole("button", { name: "Post" }).click();
  await expect(publicCard.getByText(publicText)).toBeVisible();
  await internalCard.getByPlaceholder("Add an internal note…").fill(privateText);
  await internalCard.getByRole("button", { name: "Post" }).click();
  await expect(internalCard.getByText(privateText)).toBeVisible();
  await shot(page, testInfo, "staff-ticket-detail", "after-staff-work");
  await logout(page);

  // 5. Requester sees the public comment, never the note, and can flag the problem as resolved.
  await login(page, ACCOUNTS.requester);
  const ticketLink = page
    .getByRole("link", { name: summary })
    .or(page.getByRole("row", { name: summary }).getByRole("link"));
  await expect(ticketLink.first()).toBeVisible();
  await ticketLink.first().click();

  await expect(page.getByText(publicText)).toBeVisible();
  await expect(page.getByText(privateText)).toHaveCount(0);
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/You told IT Staff this problem appears resolved/i)).toBeVisible();
  await shot(page, testInfo, "staff-ticket-detail", "requester-view");
  await logout(page);

  // 6. IT Staff sees the indication but the ticket is not resolved by it.
  await login(page, ACCOUNTS.staff);
  await page.getByLabel("Search tickets").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("link", { name: new RegExp(ticketNumber) }).first().click();
  await expect(page.getByText(/Requester has indicated this appears resolved/i)).toBeVisible();
  await expect(page.getByLabel("Current Status").locator("option").first()).toHaveText(/OPEN \(current\)/);
});
