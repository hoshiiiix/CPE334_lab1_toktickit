# Lab 3 UI Specification — Zen Green Theme Extensions

Reuses all tokens, form/list/badge/validation/responsive rules from
`docs/lab-02/ui-spec.md`. This file only documents what's new.

## 1. New Badge: Role
| Role | Style |
|---|---|
| Requester | neutral gray badge |
| IT Staff | `--color-secondary` text on `--color-pale` bg |
| Administrator | `--color-primary` text on white, bordered |

## 2. Login Screen
- Centered card (like the old Requester Selector, same card width).
- Email + password fields, password visibility toggle (eye icon).
- Single generic error banner for invalid credentials/inactive account
  (BR-01/AC-02) — never a field-specific "email not found" hint.
- Busy state on Sign In (spinner + disabled), matching Create Ticket's submit
  button convention.
- "Forgot your password?" link present but inert/disabled in Lab 3 (out of
  scope), tooltip: "Coming in a future release."

## 3. Change Password Screen (mandatory, non-skippable)
- Shown immediately after login when `mustChangePassword = true`; no nav, no
  back button, no way to reach other screens.
- Fields: current (temporary) password, new password, confirm new password —
  all with visibility toggles.
- Live checklist below New Password (green check per satisfied rule): ≥8 chars,
  upper+lower case, a number, a special character — matches the reference
  screenshot exactly.
- Continue button disabled until all rules pass and confirm matches.

## 4. Authenticated App Shell
- Replaces the Development Requester name/Change Requester control with: user's
  name + Role badge (top right), Profile dropdown containing Logout.
- Navigation is role-conditional:
  - Requester: My Tickets, Create Ticket
  - IT Staff **and Administrator**: My Queue, Create Ticket
  - Administrator additionally: Admin (User Management) — **[Approved]**
    Administrator shares full IT Staff ticket permissions plus user
    management.

## 5. Requester Ticket Detail — additions
- New "Public Comments" panel below Attachments: comment list (author name +
  role badge + timestamp), textarea + Post button, matches Zen Green card style.
- New "Mark as Appears Resolved" secondary button near the status field; once
  clicked, shows a pale-green confirmation strip ("You've indicated this
  appears resolved. IT Staff will confirm.") and the button becomes disabled.

## 6. IT Staff / Administrator Ticket Queue (new screen, "My Queue")
- Toolbar: search (ticket number/summary), filter button opening
  Category/Requested Priority/IT Priority/Status/Owner (including "Unassigned")
  filters, matching the reference screenshot's "Filters" button pattern.
- Desktop table columns: Ticket No., Created Date, Summary, Category,
  Req. Priority, IT Priority, Status, Owner — each priority/status a badge.
- Mobile: card view, same fields as Lab 2's My Tickets cards plus Owner.
- Empty/no-results/loading/forbidden(403)/failure states per Lab 2 convention.
- Row click → Ticket Detail (staff view). Accessible identically to IT Staff and
  Administrator accounts.

## 7. Staff Ticket Detail (extends Lab 2's read-only Ticket Detail)
- Header fields same layout as Requester's, but Category/Related System/
  Summary/Description remain read-only (out of Lab 3 scope to edit these);
  **Ticket Owner** becomes an editable dropdown (active IT Staff/Administrator +
  "Unassigned"), **IT Priority** becomes an editable dropdown, **Current Status**
  becomes an editable dropdown showing only the transitions permitted from the
  current state (BR-12) — invalid targets are not even listed, not just
  disabled.
- Tabs/sections below the header: Public Comments | Internal Notes |
  Attachments — each with its own count badge, matching the reference
  screenshot's tab row (Public Comments, Internal Notes, Attachments, Service
  Actions — Service Actions tab is present but empty/disabled in Lab 3, labeled
  "Coming in Lab 4").
- Public Comments panel: green-tinted card border, "Add Public Comment" box.
- Internal Notes panel: amber/gray-tinted card border with a small lock icon
  and the caption "Only visible to IT Staff and Administrators" always shown
  above the entry box, to prevent accidental public posting (labsheet §8.4
  requirement for visual distinction).
- Reachable and fully functional for both IT Staff and Administrator accounts.

## 8. Administrator User Management (new screen)
- Two-pane layout matching the reference screenshot: left = user table
  (Name, Role badge, Status badge, sortable), search box + Filters button above
  it, "+ Create User" button top-right; right = slide-over panel for
  create/edit (Full Name, Email, Role dropdown, Active toggle, and — create
  mode only — Initial Password field; edit mode instead shows a "Set New
  Initial Password" action that opens a small confirm dialog).
- Deactivate/Reactivate button in the edit panel, styled destructive
  (red outline) only for Deactivate; disabled with a tooltip
  ("You cannot deactivate your own account" / "At least one active
  Administrator is required") when BR-16 would be violated.
- Validation: inline field errors (duplicate email, missing name, weak initial
  password) exactly like Create Ticket's pattern.
- Forbidden state: if a non-Administrator somehow reaches this route (should be
  blocked by the router guard), show a full-page "Access Denied" message
  instead of the screen content. (IT Staff can reach My Queue but never Admin.)

## 9. Screen States (all Lab 3 screens)
Same vocabulary as Lab 2 (loading/success/empty/no-results/error), plus:
**Forbidden** (403 — distinct "You don't have permission to view this" state,
not the same visual as generic Error) and **Conflict** (409 — inline message
near the control that triggered it, e.g. an illegal status transition).

## 10. Responsive & Accessibility
Same rules as Lab 2 (`docs/lab-02/ui-spec.md` §8, §9) — desktop ≥992px,
tablet 768–991px, mobile <768px; keyboard operability and visible focus on every
new control (role dropdown, status dropdown, comment/note textareas, password
visibility toggles).

## 11. Visual Inspection Checklist (additions to Lab 2's)
- [ ] Public Comments and Internal Notes are never visually confusable
- [ ] Role badge always visible in the app shell header
- [ ] Password checklist updates live and matches actual validation
- [ ] Status dropdown never lists a transition forbidden by BR-12
- [ ] Admin screen fully unreachable (nav + direct URL) for IT Staff/Requester;
      My Queue reachable by both IT Staff and Administrator
- [ ] Screenshots captured desktop/tablet/mobile for: Login, Change Password,
      IT Staff Queue, IT Staff Ticket Detail, User Management — saved under
      `artifacts/lab-03/screenshots/<screen>/`
