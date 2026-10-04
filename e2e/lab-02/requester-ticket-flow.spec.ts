import { test, expect } from "@playwright/test";
import { ACCOUNTS, login } from "../lab-03/helpers";

// Lab 2 regression (Lab 3): the Development Requester selector is gone, so these flows
// now start from the real login with the seeded dev data.
test("Requester creates a ticket, finds it, and manages an attachment", async ({ page }) => {
  await login(page, ACCOUNTS.requester);

  await expect(page).toHaveURL(/\/tickets$/);

  await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
  await page.getByLabel(/Category/i).selectOption({ index: 1 });
  await page.getByLabel(/Related System/i).selectOption({ index: 1 });
  const ticketTitle = `E2E test: printer offline ${Date.now()}`;
  await page.getByLabel(/Ticket Summary/i).fill(ticketTitle);
  await page.getByLabel(/Description/i).fill("The printer on the 3rd floor shows offline.");
  await page.getByRole("button", { name: /Submit Ticket/i }).click();

  await expect(page.getByText(/TKT-\d{4}-\d{6}/)).toBeVisible();

  await page.getByRole("button", { name: /View My Tickets/i }).click();

  // Desktop/Tablet: tickets are table rows, with the link only on the ticket number cell.
  // Mobile: each ticket is rendered as a single full-width link/card containing all the text.
  const ticketLink = page
    .getByRole("link", { name: ticketTitle })
    .or(page.getByRole("row", { name: ticketTitle }).getByRole("link"));

  await expect(ticketLink.first()).toBeVisible();
  await ticketLink.first().click();

  await expect(page.getByRole("heading", { name: /Attachments/i })).toBeVisible();
});

test("A different requester cannot open another requester's ticket by direct URL", async ({ page }) => {
  await login(page, ACCOUNTS.otherRequester);
  await expect(page).toHaveURL(/\/tickets$/);

  // Assumes ticket id 1 belongs to a different seeded requester in a fresh DB.
  await page.goto("/tickets/1");
  await expect(page.getByText(/Ticket not found/i)).toBeVisible();
});
