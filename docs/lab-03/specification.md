# Lab 3 Sprint Engineering Specification — TokTickIT Users, Roles, IT Staff, Admin

## 1. Sprint Goal
Replace the temporary Development Requester selector with real email/password
authentication and server-enforced role-based authorization for three roles
(Requester, IT Staff, Administrator), deliver an operational IT Staff Ticket Queue
and Ticket Detail workflow (ownership, IT Priority, status, Public Comments,
Internal Notes), and a minimalist Administrator User Management screen — all
without breaking the completed Lab 2 Requester ticketing increment.

## 2. Stakeholder Request Interpretation
The temporary requester picker was fine for development but the system now needs
real accounts. Replace it with secure login, including a forced password change on
first login for accounts created with a temporary password. Requesters keep using
their Lab 2 ticket screens, but ownership now comes from the authenticated session,
not a client-supplied id. IT Staff need a queue to find and work tickets: claim/
reassign, set IT Priority, move status forward, talk to the Requester via Public
Comments, and keep private Internal Notes. Requesters can flag a ticket as
"appears resolved" but only IT Staff can formally resolve/close it. Every
protected action must be enforced server-side — a hidden button is not security.

## 3. Scope

### Included
- Email/password authentication, logout, current-user retrieval
- Mandatory password change for accounts with an initial/temporary password
- Server-side role-based authorization for Requester, IT Staff, Administrator
- Migration of Lab 2 DevRequester data into the real User model (same ids —
  see §7)
- Continued Requester ticket/attachment ownership, now via session identity
- Requester: Public Comments + "problem appears resolved" flag
- IT Staff **and Administrator**: Ticket Queue (search/filter/sort/paginate),
  Ticket Detail, claim/reassign ownership, IT Priority, status transitions,
  Public Comments, Internal Notes — **[Approved]** the authorization matrix
  grants Administrator the same ticket-queue permissions as IT Staff, in
  addition to user management, per stakeholder decision.
- Administrator: minimalist User Management (list, search, create, edit, role
  assignment, activation, reset initial password)

### Excluded
- Password-reset email, MFA, social login, SSO, self-registration
- Actions Taken (Lab 4), SLA/escalation, dashboards/KPIs beyond queue counts
- Multi-tenant orgs/departments, user deletion, bulk ops, import/export
- Multiple roles per user, account audit history, mandatory pagination/multi-sort
  on the admin user list

## 4. Functional Requirements
- FR-01: The system shall authenticate a user by email and password and establish
  a server-side session on success.
- FR-02: The system shall reject authentication for inactive accounts or invalid
  credentials with a single generic message (no hint which factor was wrong).
- FR-03: The system shall force any user whose account has
  `mustChangePassword = true` into a password-change flow before any other screen
  is reachable.
- FR-04: The system shall expose a current-user endpoint returning the
  authenticated identity, role, and password-change flag.
- FR-05: The system shall let an authenticated user log out, invalidating the
  session.
- FR-06: The system shall determine Requester ticket/attachment ownership solely
  from the authenticated session, ignoring any client-supplied requester id.
- FR-07: The system shall let a Requester post a Public Comment on an owned
  ticket and flag it as "problem appears resolved" (without changing
  `currentStatus`).
- FR-08: The system shall let IT Staff **or Administrator** retrieve a
  searchable, filterable, sortable, paginated Ticket Queue across all tickets.
- FR-09: The system shall let IT Staff/Administrator claim an unassigned ticket
  or reassign an already-owned ticket to themselves or another active IT Staff/
  Administrator.
- FR-10: The system shall let IT Staff/Administrator set IT Priority and perform
  permitted status transitions on a ticket.
- FR-11: The system shall let IT Staff/Administrator post Public Comments and
  Internal Notes on a ticket; Internal Notes are never returned to a Requester.
- FR-12: The system shall let an Administrator list, search, create, edit, and
  (de)activate user accounts, and issue a new temporary password.
- FR-13: The system shall prevent an Administrator from deactivating their own
  account or removing the last active Administrator.

## 5. Business Rules
- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user with `mustChangePassword = true` cannot reach normal application
  screens until a new valid password is saved; the change-password endpoint is the
  only authenticated endpoint reachable in this state (besides logout/current-user).
- BR-03: The authenticated session's user id, not any client-supplied
  `requesterId`, determines ownership for all Requester operations (replaces Lab
  2's `X-Dev-Requester-Id` header entirely).
- BR-04: Public Comments are visible to the ticket's Requester, and to any IT
  Staff/Administrator. Internal Notes are visible only to IT Staff/Administrator.
- BR-05: A Requester may set `requesterMarkedResolved = true` on their ticket but
  cannot set `currentStatus` to `RESOLVED` or `CLOSED` themselves.
- BR-06: Passwords are hashed with bcrypt (cost factor 12); plaintext passwords
  are never stored or logged.
- BR-07: Login is rate-limited per account (documented, simple in-memory/DB
  counter acceptable for this lab) after 5 consecutive failures within 15 minutes,
  to slow brute-force attempts.
- BR-08: Session tokens are stored in an httpOnly, `SameSite=Lax` cookie; they are
  never exposed to client-side JavaScript and are never committed to source
  control. **[Approved]** Sessions expire after 7 days ("stay signed in" style),
  refreshed on activity.
- BR-09: A Requester's email must be unique across all users (Requester, IT
  Staff, Administrator share one `User` table and one email namespace).
- BR-10: Ticket ownership (`ticketOwnerId`) may be null (unassigned) or must
  reference an active IT Staff or Administrator user.
- BR-11: `requestedPriority` is set once by the Requester at creation and is
  never changed. `itPriority` defaults to a copy of `requestedPriority` at
  creation and may only be changed by IT Staff/Administrator thereafter.
- BR-12: Permitted status transitions (Lab 3 scope, no Actions Taken gate):
  `NEW → OPEN`, `OPEN → IN_PROGRESS`, `IN_PROGRESS → WAITING_FOR_REQUESTER`,
  `WAITING_FOR_REQUESTER → IN_PROGRESS`, `IN_PROGRESS → RESOLVED`,
  `RESOLVED → CLOSED`, `RESOLVED → REOPENED`, `CLOSED → REOPENED`,
  any active status `→ CANCELLED`. Only IT Staff/Administrator may transition a
  ticket; any transition not in this table is rejected with 409.
- BR-13: Public Comments and Internal Notes are append-only in Lab 3 (no edit/
  delete); content is required, trimmed, 1–2000 characters, and rejected if
  empty/whitespace-only.
- BR-14: An Administrator creates a user with exactly one role
  (`REQUESTER`/`IT_STAFF`/`ADMINISTRATOR`), a name, a unique email, an activation
  state, and an initial password; the created account always starts with
  `mustChangePassword = true`.
- BR-15: Duplicate email addresses are rejected on both create and edit with a
  clear field-level error.
- BR-16: An Administrator cannot deactivate their own account, and the system
  rejects any edit that would leave zero active Administrators.
- BR-17: Deactivation, not deletion, is the only way to remove a user's access;
  deactivated users cannot authenticate (BR-01) even with correct credentials.
- BR-18: **[Approved — Option A]** The Lab 2 `DevRequester` table is migrated
  in place into `User` rows with `role = REQUESTER`, keeping the exact same
  primary key ids (the migration adds `passwordHash`, `role`,
  `mustChangePassword`, etc. columns to the existing table/rows rather than
  creating new ones). `Ticket.requesterId` foreign keys require **no changes**
  since the referenced ids never move — this is the simplest, lowest-risk path
  to preserving existing ticket ownership.

## 6. UI Specification Summary
See `docs/lab-03/ui-spec.md`. Summary: Login screen (email/password, busy/error
states) → mandatory Change Password screen when required → authenticated shell
showing name+role badge and Logout, with role-specific navigation (Requester:
My Tickets/Create Ticket; IT Staff **and Administrator**: My Queue/Create Ticket,
plus Admin for Administrators). Requester Ticket Detail gains a Public Comments
panel and a "Mark as Appears Resolved" action. IT Staff Ticket Queue is a
searchable/filterable/sortable/paginated table (responsive to cards). IT Staff
Ticket Detail adds Ticket Owner (claim/reassign), IT Priority, status dropdown
(permitted transitions only), and two visually distinct panels: Public Comments
(green, shared) vs Internal Notes (amber/gray, staff-only). Administrator User
Management: single-page list + search + role filter + slide-over create/edit
panel, matching the reference screenshot.

## 7. Data Changes
- **User** (evolved in place from `DevRequester` — same ids, BR-18 Option A):
  `id`, `name`, `email` (unique), `passwordHash`, `role` (enum
  `REQUESTER`/`IT_STAFF`/`ADMINISTRATOR`), `isActive`, `mustChangePassword`,
  `createdAt`, `updatedAt`.
- **Session**: `id` (token), `userId` (FK), `expiresAt` (createdAt + 7 days per
  BR-08), `createdAt`.
- **Ticket** (extended): add `ticketOwnerId` (nullable FK → User),
  `requesterMarkedResolved` (boolean, default false); `requesterId` FK continues
  to point at the same `User.id` values (no remapping needed — BR-18);
  `currentStatus` enum extended to `NEW, OPEN, IN_PROGRESS,
  WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED`.
- **PublicComment**: `id`, `ticketId` (FK), `authorId` (FK → User), `content`,
  `createdAt`.
- **InternalNote**: `id`, `ticketId` (FK), `authorId` (FK → User), `content`,
  `createdAt`.
- Migration steps: (1) rename `DevRequester` table to `User` (or add columns to
  it in place); (2) add `passwordHash`, `role` (default `REQUESTER` for existing
  rows), `mustChangePassword` (default `false` for existing seeded rows, since
  they already have a documented local dev password — see README), `isActive`
  already exists; (3) seed 3 active + 1 inactive IT Staff and 1 active
  Administrator as new `User` rows; (4) extend `Ticket` and add
  `PublicComment`/`InternalNote` tables; no `Ticket.requesterId` data migration
  needed.

## 8. API Contract
See `docs/lab-03/api-spec.md`. New/changed endpoints: `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`,
`GET /api/staff/tickets` (queue, IT Staff **or** Administrator),
`GET /api/staff/tickets/:id`, `PATCH /api/staff/tickets/:id/owner`,
`PATCH /api/staff/tickets/:id/priority`, `PATCH /api/staff/tickets/:id/status`,
`POST/GET /api/tickets/:id/comments`, `POST/GET /api/tickets/:id/notes`
(staff-only), `PATCH /api/tickets/:id/mark-resolved` (Requester),
`GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`,
`POST /api/admin/users/:id/reset-password`.
All existing Lab 2 Requester ticket/attachment endpoints keep their paths but
switch from `X-Dev-Requester-Id` to session-based identity.

## 9. Acceptance Criteria
- AC-01: Given an active user with valid credentials, when they log in, then a
  session is established and the response includes their id, name, role, and
  `mustChangePassword`.
- AC-02: Given invalid credentials or an inactive account, when login is
  attempted, then a single generic "Invalid email or password" message is shown,
  never revealing which case applied.
- AC-03: Given a user with `mustChangePassword = true`, when they log in
  successfully, then they are routed to Change Password and cannot reach any
  other screen until a valid new password is saved.
- AC-04: Given an authenticated Requester, when the client sends a different
  `requesterId` anywhere in the request, then the backend still uses the session
  identity and never returns another Requester's data.
- AC-05: Given a Requester account, when a request is made to an Internal Notes
  endpoint, then it is rejected (403) without exposing any note content.
- AC-06: Given IT Staff **or Administrator** opens the Ticket Queue, when they
  search/filter/sort/paginate, then results reflect all requesters' tickets (not
  owner-scoped) per the chosen criteria.
- AC-07: Given an unassigned ticket, when IT Staff/Administrator clicks Claim,
  then `ticketOwnerId` becomes their id and the queue reflects the new owner.
- AC-08: Given a ticket in `IN_PROGRESS`, when IT Staff/Administrator attempts
  to set status to `NEW`, then the transition is rejected (409) as not
  permitted.
- AC-09: Given a Requester views their own ticket, when they click "Mark as
  Appears Resolved", then `requesterMarkedResolved` becomes true but
  `currentStatus` is unchanged.
- AC-10: Given an Administrator creates a user with an email that already
  exists, when submitted, then a field-level "Email already in use" error is
  shown and no user is created.
- AC-11: Given the only active Administrator, when they attempt to deactivate
  their own account, then the request is rejected with a clear message.
- AC-12: Given a Requester (only non-staff role), when they call any
  `/api/admin/*` or `/api/staff/*` endpoint, then the request is rejected with
  403.
- AC-13: Given a user logs out, when they attempt to access any protected
  screen/endpoint afterward, then they are redirected to Login / receive 401.
- AC-14: Given the Lab 2 seeded DevRequesters, when the Lab 3 migration runs,
  then each becomes a `User` with the same id, `role=REQUESTER`, and all their
  existing tickets remain correctly owned with zero data changes to
  `Ticket.requesterId`.
- AC-15: Given a user logs in successfully, when 7 days pass without activity,
  then their session is expired and they must log in again.

## 10. Definition of Done
- All FR/BR/AC above implemented and covered by at least one automated test.
- `npm test` passes in `client/` and `server/` on the final `main` branch; E2E
  suite (`e2e/lab-03/`) passes.
- No Lab 2 Requester regression: existing Lab 2 tests still pass after the
  DevRequester → User migration.
- Every protected endpoint verified to reject unauthenticated and
  wrong-role access (not just hidden in the UI), including both IT Staff and
  Administrator successfully accessing `/api/staff/*`.
- Manual visual inspection at desktop/tablet/mobile matches `ui-spec.md` for
  Login, Change Password, IT Staff Queue, IT Staff Ticket Detail, and Admin User
  Management.
- README updated with Lab 3 setup/seeded test accounts (clearly marked
  local-dev-only, non-real passwords).
- All Lab 3 GitHub Issues in `Done`, each merged into `lab3-staging` via
  peer-reviewed PR, followed by one final reviewed PR from `lab3-staging` to
  `main`.

## 11. Assumptions and Decisions
- Session storage: server-side session id in an httpOnly cookie (not a JWT in
  localStorage), to avoid exposing tokens to XSS and to allow simple server-side
  logout invalidation, appropriate for this course's local-only deployment.
- **[Approved]** Session lifetime: 7 days from last activity (BR-08).
- **[Approved]** Administrator has the same Ticket Queue/Detail permissions as
  IT Staff, in addition to User Management (§3 Scope).
- **[Approved]** DevRequester → User migration keeps identical primary key ids
  (Option A, BR-18) — no `Ticket.requesterId` remapping required.
- Password policy (matches the reference screenshot): minimum 8 characters,
  at least one uppercase, one lowercase, one number, one special character.
- Seeded dev-only credentials are documented in the README, clearly labeled
  "local development only — do not reuse," never real personal passwords.
- The Lab 2 `X-Dev-Requester-Id` header and the entire Development Requester
  selector UI are removed in this sprint (per Section 8.2 of the labsheet).
- `PublicComment` and `InternalNote` are modeled as two separate tables (not one
  table with a "visibility" flag) for a simpler, harder-to-misuse authorization
  check on the Internal Notes endpoint.
