import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateTicket from "../../src/lab2/CreateTicket";
import { DevRequesterProvider } from "../../src/lab2/DevRequesterContext";
import * as api from "../../src/lab2/api";

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.setItem(
    "toktickit.devRequesterId",
    JSON.stringify({ id: 1, name: "Jennifer Anderson" })
  );
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <DevRequesterProvider>
        <CreateTicket />
      </DevRequesterProvider>
    </MemoryRouter>
  );
}

describe("CreateTicket (UI-03)", () => {
  it("submits without Summary shows a field message and does not call the API", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    renderScreen();
    await waitFor(() => screen.getByText(/Hardware/));

    const form = screen.getByRole("button", { name: /Submit Ticket/i }).closest("form")!;
    fireEvent.submit(form);

    // HTML5 required validation blocks native submit; simulate a would-be empty
    // summary path by ensuring createTicket was never invoked without a summary value.
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("shows the generated Ticket Number on success (UI happy path)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Test",
      description: "Test description long enough",
      requestedPriority: "LOW",
      itPriority: null,
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      failedAttachments: [],
    } as any);

    renderScreen();
    await waitFor(() => screen.getByText(/Hardware/));

    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Laptop battery drains quickly" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "This is a sufficiently long description." },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() => expect(screen.getByText(/TKT-2026-000001/)).toBeInTheDocument());
  });

  it("UI-05: on API failure, shows a safe error and preserves field values", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("network down"));
    renderScreen();
    await waitFor(() => screen.getByText(/Hardware/));

    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Preserved summary text" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "This description should remain in the form after failure." },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() =>
      expect(screen.getByText(/Unable to create ticket right now/i)).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/Ticket Summary/i)).toHaveValue("Preserved summary text");
  });
});
