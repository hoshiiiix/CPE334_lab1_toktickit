import { useEffect, useState, FormEvent } from "react";
import { ApiError } from "../lab2/api";
import { useAuth } from "./AuthContext";
import {
  AdminUser, UserRole, listUsers, createUser, updateUser, setInitialPassword,
} from "./adminApi";

type ListState = "loading" | "success" | "empty" | "no-results" | "error" | "forbidden";
type Panel = { mode: "create" } | { mode: "edit"; user: AdminUser } | null;

const ROLE_LABEL: Record<UserRole, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};
const ROLES = Object.keys(ROLE_LABEL) as UserRole[];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the server policy (BR-06) so the Administrator gets feedback before submitting.
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character";
  return null;
}

function RoleBadge({ role }: { role: UserRole }) {
  return <span className="badge tk-badge-new">{ROLE_LABEL[role]}</span>;
}
function StatusBadge({ active }: { active: boolean }) {
  return <span className={`badge ${active ? "tk-badge-new" : "tk-badge-high"}`}>{active ? "Active" : "Inactive"}</span>;
}

interface FormState { name: string; email: string; role: UserRole; isActive: boolean; initialPassword: string; }
const EMPTY_FORM: FormState = { name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "" };

export default function UserManagement() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listState, setListState] = useState<ListState>("loading");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState("");

  const [panel, setPanel] = useState<Panel>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setListState("loading");
    listUsers({ search: search || undefined, role: roleFilter || undefined })
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        if (data.length > 0) setListState("success");
        else setListState(search || roleFilter ? "no-results" : "empty");
      })
      .catch((err) => {
        if (!cancelled) setListState(err instanceof ApiError && err.status === 403 ? "forbidden" : "error");
      });
    return () => { cancelled = true; };
  }, [search, roleFilter, reloadKey]);

  function resetFeedback() {
    setFieldErrors({});
    setFormError("");
    setShowPasswordForm(false);
    setNewPassword("");
    setResetError("");
    setResetNotice("");
  }

  function openCreate() {
    resetFeedback();
    setNotice("");
    setForm(EMPTY_FORM);
    setPanel({ mode: "create" });
  }

  function openEdit(user: AdminUser) {
    resetFeedback();
    setNotice("");
    setForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, initialPassword: "" });
    setPanel({ mode: "edit", user });
  }

  function closePanel() {
    resetFeedback();
    setPanel(null);
  }

  function showApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      if (err.fields && Object.keys(err.fields).length > 0) {
        setFieldErrors(err.fields); // shown next to the fields, not repeated in a banner
        setFormError("");
      } else {
        setFormError(err.status === 403 ? "You don't have permission to do this." : err.message);
      }
    } else {
      setFormError(fallback);
    }
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address";
    if (panel?.mode === "create") {
      const problem = passwordProblem(form.initialPassword);
      if (problem) errors.initialPassword = problem;
    }
    return errors;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!panel || saving) return;
    setFormError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (panel.mode === "create") {
        const created = await createUser({
          name: form.name.trim(), email: form.email.trim(), role: form.role,
          isActive: form.isActive, initialPassword: form.initialPassword,
        });
        setNotice(`User ${created.name} created. They must change the initial password at first login.`);
        closePanel();
      } else {
        const updated = await updateUser(panel.user.id, {
          name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive,
        });
        setNotice("User saved.");
        setPanel({ mode: "edit", user: updated });
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      showApiError(err, "Unable to save right now. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(nextActive: boolean) {
    if (panel?.mode !== "edit" || saving) return;
    setFormError("");
    setFieldErrors({});
    setSaving(true);
    try {
      const updated = await updateUser(panel.user.id, { isActive: nextActive });
      setNotice(nextActive ? "User reactivated." : "User deactivated.");
      setForm((f) => ({ ...f, isActive: updated.isActive }));
      setPanel({ mode: "edit", user: updated });
      setReloadKey((k) => k + 1);
    } catch (err) {
      showApiError(err, "Unable to update the account right now. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPassword() {
    if (panel?.mode !== "edit" || resetting) return;
    setResetError("");
    setResetNotice("");
    const problem = passwordProblem(newPassword);
    if (problem) { setResetError(problem); return; }

    setResetting(true);
    try {
      await setInitialPassword(panel.user.id, newPassword);
      setNewPassword("");
      setShowPasswordForm(false);
      setResetNotice("New initial password set. The user must change it at next login.");
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Unable to set the password right now.");
    } finally {
      setResetting(false);
    }
  }

  if (listState === "forbidden") {
    return (
      <div>
        <h1 className="h4">Access Denied</h1>
        <p>You don't have permission to manage users.</p>
      </div>
    );
  }

  // Client-side hints that mirror the server rules (the server remains the real control).
  const editing = panel?.mode === "edit" ? panel.user : null;
  const editingSelf = editing !== null && me?.id === editing.id;
  const activeAdmins = users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive);
  const isLastActiveAdmin =
    editing !== null && editing.role === "ADMINISTRATOR" && editing.isActive &&
    activeAdmins.length === 1 && activeAdmins[0].id === editing.id;
  const deactivateBlocked = editingSelf || isLastActiveAdmin;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Users</h1>
        <button type="button" className="btn btn-success" onClick={openCreate}>+ Create User</button>
      </div>

      {notice && <div className="alert alert-success py-2" role="status">{notice}</div>}

      <div className="row g-3">
        <div className={panel ? "col-lg-7" : "col-12"}>
          <form
            className="row g-2 mb-3"
            role="search"
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
          >
            <div className="col-sm-6">
              <input
                className="form-control"
                aria-label="Search users"
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-6 col-sm-3">
              <select
                className="form-select"
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-3">
              <button type="submit" className="btn btn-outline-success w-100">Search</button>
            </div>
          </form>

          {listState === "loading" && <p role="status">Loading users…</p>}
          {listState === "error" && <p className="text-danger" role="alert">Unable to load users right now.</p>}
          {listState === "empty" && <p>No users yet.</p>}
          {listState === "no-results" && <p>No users match your search or filter.</p>}

          {listState === "success" && (
            <>
              <div className="table-responsive d-none d-md-block">
                <table className="table bg-white align-middle">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><RoleBadge role={u.role} /></td>
                        <td><StatusBadge active={u.isActive} /></td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-outline-success" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-md-none">
                {users.map((u) => (
                  <div key={u.id} className="card p-2 mb-2">
                    <strong>{u.name}</strong>
                    <div className="small text-break">{u.email}</div>
                    <div className="d-flex gap-2 mt-1 align-items-center flex-wrap">
                      <RoleBadge role={u.role} />
                      <StatusBadge active={u.isActive} />
                      <button type="button" className="btn btn-sm btn-outline-success ms-auto" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {panel && (
          <div className="col-lg-5">
            <section className="card p-3" aria-label={panel.mode === "create" ? "Create New User" : "Edit User"}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">{panel.mode === "create" ? "Create New User" : "Edit User"}</h2>
                <button type="button" className="btn-close" aria-label="Close panel" onClick={closePanel} />
              </div>

              <form onSubmit={handleSave} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="user-name">Full name</label>
                  <input
                    id="user-name"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    value={form.name}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {fieldErrors.name && <div className="tk-field-error">{fieldErrors.name}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="user-email">Email address</label>
                  <input
                    id="user-email"
                    type="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  {fieldErrors.email && <div className="tk-field-error">{fieldErrors.email}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="user-role">Role</label>
                  <select
                    id="user-role"
                    className={`form-select ${fieldErrors.role ? "is-invalid" : ""}`}
                    aria-invalid={fieldErrors.role ? true : undefined}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  {fieldErrors.role && <div className="tk-field-error">{fieldErrors.role}</div>}
                </div>

                {panel.mode === "create" && (
                  <>
                    <div className="form-check form-switch mb-3">
                      <input
                        id="user-active"
                        type="checkbox"
                        role="switch"
                        className="form-check-input"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="user-active">Active</label>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="user-initial-password">Initial password</label>
                      <input
                        id="user-initial-password"
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${fieldErrors.initialPassword ? "is-invalid" : ""}`}
                        aria-invalid={fieldErrors.initialPassword ? true : undefined}
                        value={form.initialPassword}
                        onChange={(e) => setForm({ ...form, initialPassword: e.target.value })}
                      />
                      {fieldErrors.initialPassword && <div className="tk-field-error">{fieldErrors.initialPassword}</div>}
                      <div className="form-text">
                        Use upper and lower case letters, a number and a special character.
                        The user must change it at first login.
                      </div>
                    </div>
                  </>
                )}

                {formError && <div className="alert alert-danger py-2" role="alert">{formError}</div>}

                <button type="submit" className="btn btn-success w-100 mb-2" disabled={saving}>
                  {saving ? "Saving…" : "Save User"}
                </button>
                <button type="button" className="btn btn-outline-secondary w-100" onClick={closePanel} disabled={saving}>Cancel</button>
              </form>

              {editing && (
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="small">Account status:</span>
                    <StatusBadge active={editing.isActive} />
                  </div>

                  {editing.isActive ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-danger w-100"
                        disabled={deactivateBlocked || saving}
                        onClick={() => handleToggleActive(false)}
                      >
                        Deactivate User
                      </button>
                      {editingSelf && <div className="form-text">You cannot deactivate your own account.</div>}
                      {!editingSelf && isLastActiveAdmin && (
                        <div className="form-text">At least one active Administrator is required.</div>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-success w-100"
                      disabled={saving}
                      onClick={() => handleToggleActive(true)}
                    >
                      Reactivate User
                    </button>
                  )}

                  <div className="mt-3">
                    {!showPasswordForm ? (
                      <button type="button" className="btn btn-outline-secondary w-100" onClick={() => { setShowPasswordForm(true); setResetNotice(""); }}>
                        Set New Initial Password
                      </button>
                    ) : (
                      <>
                        <label className="form-label small" htmlFor="user-new-password">New initial password</label>
                        <input
                          id="user-new-password"
                          type="password"
                          autoComplete="new-password"
                          className={`form-control ${resetError ? "is-invalid" : ""}`}
                          aria-invalid={resetError ? true : undefined}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        {resetError && <div className="tk-field-error">{resetError}</div>}
                        <div className="d-flex gap-2 mt-2">
                          <button type="button" className="btn btn-success flex-fill" onClick={handleConfirmPassword} disabled={resetting}>
                            {resetting ? "Setting…" : "Confirm New Password"}
                          </button>
                          <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowPasswordForm(false); setNewPassword(""); setResetError(""); }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                    {resetNotice && <div className="tk-success-panel small mt-2" role="status">{resetNotice}</div>}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
