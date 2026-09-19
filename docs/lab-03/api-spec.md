# Lab 3 API Contract — TokTickIT Users, Roles, IT Staff, Admin

## Authentication mechanism
Server-side session, id stored in an httpOnly, `SameSite=Lax` cookie
(`toktickit_session`), **expiring 7 days from last activity** (BR-08). No token
is ever returned in a JSON body or exposed to client JS. All endpoints below
except `POST /api/auth/login` require a valid session cookie; missing/invalid/
expired session → `401`.
`mustChangePassword = true` on the session's user restricts them to
`POST /api/auth/change-password`, `GET /api/auth/me`, and `POST /api/auth/logout`
only — every other endpoint returns `403` with `{ "error": "Password change required" }`.

**Role gate**: `/api/staff/*` and comment/note-posting endpoints accept
`IT_STAFF` **or** `ADMINISTRATOR`. `/api/admin/*` accepts `ADMINISTRATOR` only.

## POST /api/auth/login
Body: `{ "email": string, "password": string }`
- 200: `{ "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER", "mustChangePassword": false }` (+ sets 7-day session cookie)
- 401: `{ "error": "Invalid email or password" }` (used for both wrong password AND inactive account — BR-01/AC-02)
- 429: `{ "error": "Too many attempts. Try again later." }` (BR-07)

## POST /api/auth/logout
- 200: `{ "success": true }` (clears/invalidates session)

## GET /api/auth/me
- 200: `{ "id": 1, "name": "...", "email": "...", "role": "...", "mustChangePassword": false }`
- 401: not authenticated

## POST /api/auth/change-password
Body: `{ "currentPassword": string, "newPassword": string, "confirmPassword": string }`
- 200: `{ "success": true }`, `mustChangePassword` set to false
- 400: password policy violation, mismatch, or wrong current password

## GET /api/staff/tickets (IT Staff or Administrator — Ticket Queue)
Query: `search`, `categoryId`, `requestedPriority`, `itPriority`, `status`,
`ownerId` (or `unassigned=true`), `sort`, `order`, `page`, `pageSize` (same
defaults/limits as Lab 2's `/api/tickets`).
- 200: `{ "data": [...tickets with ticketOwner name...], "pagination": {...} }`
- 403: Requester role

## GET /api/staff/tickets/:id (IT Staff or Administrator)
- 200: full ticket incl. attachments, comments, notes, owner
- 404: ticket not found
- 403: Requester role

## PATCH /api/staff/tickets/:id/owner
Body: `{ "ownerId": number | null }` (null = unclaim)
- 200: updated ticket; `ownerId` must reference an active IT Staff/Administrator
- 400: invalid owner (inactive or wrong role)
- 403: Requester role

## PATCH /api/staff/tickets/:id/priority
Body: `{ "itPriority": "LOW"|"MEDIUM"|"HIGH" }`
- 200: updated ticket
- 403: Requester role

## PATCH /api/staff/tickets/:id/status
Body: `{ "status": "..." }`
- 200: updated ticket
- 409: transition not permitted per BR-12
- 403: Requester role

## POST /api/tickets/:id/comments
Body: `{ "content": string }` — Requester (own ticket) or IT Staff/Administrator (any ticket)
- 201: `{ "id", "authorId", "authorName", "authorRole", "content", "createdAt" }`
- 400: empty/too long content
- 404: ticket not found or (Requester) not owned

## GET /api/tickets/:id/comments
- 200: array, visible to ticket's Requester + any IT Staff/Administrator
- 404: not found / not owned (Requester)

## POST /api/tickets/:id/notes (IT Staff or Administrator only)
Body: `{ "content": string }`
- 201: note object
- 403: Requester role (BR-04, AC-05 — content never included in the 403 body)

## GET /api/tickets/:id/notes (IT Staff or Administrator only)
- 200: array
- 403: Requester role

## PATCH /api/tickets/:id/mark-resolved (Requester, own ticket only)
- 200: `{ "requesterMarkedResolved": true }`
- 404: not found / not owned
- 403: non-Requester role

## GET /api/admin/users (Administrator only)
Query: `search` (name or email), `role` (optional filter)
- 200: `[{ "id", "name", "email", "role", "isActive" }]` (no pagination per spec)
- 403: non-Administrator

## POST /api/admin/users (Administrator only)
Body: `{ "name", "email", "role", "isActive", "initialPassword" }`
- 201: created user (no password in response); `mustChangePassword = true`
- 400: duplicate email, invalid role, weak password
- 403: non-Administrator

## PATCH /api/admin/users/:id (Administrator only)
Body: `{ "name"?, "email"?, "role"?, "isActive"? }`
- 200: updated user
- 400: duplicate email; attempting to deactivate self (BR-16); attempting to
  leave zero active Administrators
- 403: non-Administrator

## POST /api/admin/users/:id/reset-password (Administrator only)
Body: `{ "newInitialPassword": string }`
- 200: `{ "success": true }`; target user's `mustChangePassword` set to true
- 403: non-Administrator

## Status Code Summary
| Status | Meaning |
|---|---|
| 200/201 | Success |
| 400 | Validation failure |
| 401 | Not authenticated |
| 403 | Authenticated but forbidden (wrong role, or password-change pending) |
| 404 | Resource missing or not owned |
| 409 | Business-rule conflict (e.g. illegal status transition) |
| 429 | Rate-limited login attempts |
| 500 | Unexpected server error, safe generic message only |
