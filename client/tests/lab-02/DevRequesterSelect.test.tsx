import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DevRequesterSelect from "../../src/lab2/DevRequesterSelect";
import { DevRequesterProvider } from "../../src/lab2/DevRequesterContext";
import * as api from "../../src/lab2/api";

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <DevRequesterProvider>
        <DevRequesterSelect />
      </DevRequesterProvider>
    </MemoryRouter>
  );
}

describe("DevRequesterSelect (UI-01)", () => {
  it("shows a loading state before requesters resolve", () => {
    vi.spyOn(api, "fetchDevRequesters").mockReturnValue(new Promise(() => {}));
    renderScreen();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the requester list once loaded", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "j@example.com" },
    ]);
    renderScreen();
    await waitFor(() => expect(screen.getByText(/Jennifer Anderson/)).toBeInTheDocument());
  });

  it("shows an empty state when no active requesters exist", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([]);
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/No active Development Requesters/i)).toBeInTheDocument()
    );
  });

  it("shows a safe error state on API failure", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockRejectedValue(new Error("network down"));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/Unable to load Development Requesters/i)).toBeInTheDocument()
    );
  });
});
