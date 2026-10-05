import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import UserManagement from "../../src/lab3/UserManagement";
import * as adminApi from "../../src/lab3/adminApi";
import { ApiError } from "../../src/lab2/api";

const refresh = vi.fn();
vi.mock("../../src/lab3/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, name: "John Smith", role: "ADMINISTRATOR", mustChangePassword: false }, refresh }),
}));

const john = { id: 1, name: "John Smith", email: "john.smith@example.com", role: "ADMINISTRATOR", isActive: true } as const;
const emily = { id: 2, name: "Emily Davis", email: "emily.davis@example.com", role: "IT_STAFF", isActive: true } as const;
const robert = { id: 3, name: "Robert Wilson", email: "robert.wilson@example.com", role: "IT_STAFF", isActive: false } as const;
const jennifer = { id: 4, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", isActive: true } as const;

beforeEach(() => {
  vi.restoreAllMocks();
  refresh.mockReset();
});

function mockList(users: any[] = [john, emily, robert, jennifer]) {
  return vi.spyOn(adminApi, "listUsers").mockResolvedValue(users as any);
}

describe("UserManagement list (UI-06)", () => {
  it("shows Name, Email, Role, Status and an Edit action for each user", async () => {
    mockList();
    render(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText("Emily Davis").length).toBeGreaterThan(0));
    expect(screen.getAllByText("emily.davis@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Edit Emily Davis" }).length).toBeGreaterThan(0);
  });

  it("searches by name or email when the search form is submitted", async () => {
    const list = mockList();
    render(<UserManagement />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: " emily " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ search: "emily", role: undefined }));
  });

  it("filters by role", async () => {
    const list = mockList();
    render(<UserManagement />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Filter by role"), { target: { value: "IT_STAFF" } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ search: undefined, role: "IT_STAFF" }));
  });

  it("shows a no-results message when a search matches nobody", async () => {
    const list = mockList();
    render(<UserManagement />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    list.mockResolvedValue([]);
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "zzz" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByText(/No users match your search or filter/i)).toBeInTheDocument());
  });

  it("shows a safe failure message when the list cannot load", async () => {
    vi.spyOn(adminApi, "listUsers").mockRejectedValue(new ApiError(500, "boom"));
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Unable to load users right now/i));
  });

  it("shows Access Denied when the API answers 403", async () => {
    vi.spyOn(adminApi, "listUsers").mockRejectedValue(new ApiError(403, "Forbidden"));
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText(/Access Denied/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Create User/i })).not.toBeInTheDocument();
  });
});

describe("UserManagement create mode (UI-06, AC-10)", () => {
  it("validates required fields and the initial password before calling the API", async () => {
    mockList();
    const create = vi.spyOn(adminApi, "createUser");
    render(<UserManagement />);
    await waitFor(() => expect(screen.getAllByText("Emily Davis").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /\+ Create User/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows the server's field-level duplicate-email error and keeps the panel open", async () => {
    mockList();
    vi.spyOn(adminApi, "createUser").mockRejectedValue(
      new ApiError(400, "Email already in use", { email: "Email already in use" })
    );
    render(<UserManagement />);
    await waitFor(() => expect(screen.getAllByText("Emily Davis").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /\+ Create User/i }));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Alex Thompson" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "emily.davis@example.com" } });
    fireEvent.change(screen.getByLabelText(/Initial Password/i), { target: { value: "Initial#Pass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));

    await waitFor(() => expect(screen.getByText("Email already in use")).toBeInTheDocument());
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("creates a user with one role and shows a success message", async () => {
    const list = mockList();
    const create = vi.spyOn(adminApi, "createUser").mockResolvedValue({
      id: 9, name: "Alex Thompson", email: "alex@example.com", role: "IT_STAFF", isActive: true, mustChangePassword: true,
    });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getAllByText("Emily Davis").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /\+ Create User/i }));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Alex Thompson" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "IT_STAFF" } });
    fireEvent.change(screen.getByLabelText(/Initial Password/i), { target: { value: "Initial#Pass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({
      name: "Alex Thompson", email: "alex@example.com", role: "IT_STAFF", isActive: true, initialPassword: "Initial#Pass1",
    }));
    await waitFor(() => expect(screen.getByText(/User Alex Thompson created/i)).toBeInTheDocument());
    expect(list.mock.calls.length).toBeGreaterThan(1); // list reloaded
  });
});

describe("UserManagement edit mode (UI-06, AC-11, BR-16)", () => {
  async function openEdit(name: string) {
    await waitFor(() => expect(screen.getAllByRole("button", { name: `Edit ${name}` }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: `Edit ${name}` })[0]);
  }

  it("prefills the form and saves name, email, role and activation state", async () => {
    mockList();
    const update = vi.spyOn(adminApi, "updateUser").mockResolvedValue({ ...emily, name: "Emily D." } as any);
    render(<UserManagement />);
    await openEdit("Emily Davis");

    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Emily Davis");
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Emily D." } });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(2, {
      name: "Emily D.", email: "emily.davis@example.com", role: "IT_STAFF", isActive: true,
    }));
    await waitFor(() => expect(screen.getByText("User saved.")).toBeInTheDocument());
  });

  it("disables Deactivate for the signed-in Administrator with an explanation", async () => {
    mockList();
    render(<UserManagement />);
    await openEdit("John Smith");

    const deactivate = screen.getByRole("button", { name: "Deactivate User" });
    expect(deactivate).toBeDisabled();
    expect(screen.getByText(/You cannot deactivate your own account/i)).toBeInTheDocument();
  });

  it("disables Deactivate for the last active Administrator even when it is not you", async () => {
    // The signed-in admin is id 1; make id 7 the only OTHER admin and deactivate id 1 in the list,
    // so id 7 is the last active Administrator.
    mockList([{ ...john, isActive: false }, { id: 7, name: "Solo Admin", email: "solo@example.com", role: "ADMINISTRATOR", isActive: true }, emily]);
    render(<UserManagement />);
    await openEdit("Solo Admin");

    expect(screen.getByRole("button", { name: "Deactivate User" })).toBeDisabled();
    expect(screen.getByText(/At least one active Administrator is required/i)).toBeInTheDocument();
  });

  it("deactivates another user and offers Reactivate for an inactive one", async () => {
    mockList();
    const update = vi.spyOn(adminApi, "updateUser").mockResolvedValue({ ...emily, isActive: false } as any);
    render(<UserManagement />);
    await openEdit("Emily Davis");

    fireEvent.click(screen.getByRole("button", { name: "Deactivate User" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(2, { isActive: false }));
    await waitFor(() => expect(screen.getByText("User deactivated.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Reactivate User" })).toBeEnabled();
  });

  it("sets a new initial password after validating it", async () => {
    mockList();
    const setPw = vi.spyOn(adminApi, "setInitialPassword").mockResolvedValue();
    render(<UserManagement />);
    await openEdit("Emily Davis");

    fireEvent.click(screen.getByRole("button", { name: "Set New Initial Password" }));
    fireEvent.change(screen.getByLabelText(/New initial password/i), { target: { value: "weak" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm New Password" }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(setPw).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/New initial password/i), { target: { value: "Another#Pass2" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm New Password" }));
    await waitFor(() => expect(setPw).toHaveBeenCalledWith(2, "Another#Pass2"));
    await waitFor(() => expect(screen.getByText(/must change it at next login/i)).toBeInTheDocument());
  });

  it("shows the server's message when the server rejects a save (safe failure)", async () => {
    mockList();
    vi.spyOn(adminApi, "updateUser").mockRejectedValue(new ApiError(500, "Unable to update the user right now."));
    render(<UserManagement />);
    await openEdit("Emily Davis");

    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Unable to update the user right now/i));
  });

  it("closes the panel with Cancel", async () => {
    mockList();
    render(<UserManagement />);
    await openEdit("Emily Davis");

    const panel = screen.getByRole("region", { name: "Edit User" });
    fireEvent.click(within(panel).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Edit User" })).not.toBeInTheDocument();
  });
});
