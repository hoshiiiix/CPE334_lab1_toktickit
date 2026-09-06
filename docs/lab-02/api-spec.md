# Lab 2 API Contract — TokTickIT Requester Ticketing MVP

All endpoints below (except the two purely global reference-data reads that don't
depend on a requester) require the header:

```
X-Dev-Requester-Id: <integer DevRequester id>
```

Missing header → `401 { "error": "Development Requester not selected" }`.
Header references an inactive/unknown requester → `401 { "error": "Invalid Development Requester" }`.

The client reads this id from `sessionStorage` (not `localStorage`), so a new
browser tab/session always starts back at the Development Requester Selection
screen — this is a deliberate simulation boundary, not a bug (see BR-03).

## GET /api/categories
Returns active categories. No requester header required.
- 200: `[{ "id": 1, "name": "Hardware" }, ...]`

## GET /api/related-systems
Returns active related systems. No requester header required.
- 200: `[{ "id": 1, "name": "Corporate Laptop" }, ...]`

## GET /api/dev-requesters
Returns active Development Requesters, for the selector. No requester header required.
- 200: `[{ "id": 1, "name": "Jennifer Anderson", "email": "jennifer@example.com" }, ...]`

## POST /api/tickets
Creates a ticket for the current requester. `multipart/form-data`.

Request fields: `categoryId` (int, required), `relatedSystemId` (int, required),
`summary` (string, 5–120 chars, required), `description` (string, 10–2000 chars,
required), `requestedPriority` (`LOW`|`MEDIUM`|`HIGH`, required), `attachments`
(0–5 files, each ≤5MB, type in JPG/JPEG/PNG/WEBP/PDF).

- 201:
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 5,
  "summary": "Laptop battery drains quickly",
  "description": "...",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "currentStatus": "NEW",
  "createdAt": "2026-08-20T09:00:00.000Z",
  "attachments": [
    { "id": 7, "originalFilename": "photo.jpg", "status": "uploaded" }
  ],
  "failedAttachments": []
}
```
- 400: field-level validation errors, e.g.
  `{ "error": "Validation failed", "fields": { "summary": "Summary must be 5-120 characters" } }`
- 415: `{ "error": "Unsupported attachment type", "fields": { "attachments": "..." } }`
- 413: attachment exceeds 5MB
- 401: missing/invalid requester (see above)
- 500: safe generic error, no internal details

## GET /api/tickets
Paginated, searchable, filterable, sortable list scoped to the current requester.

Query parameters: `search` (matches ticketNumber or summary, substring,
case-insensitive), `categoryId`, `requestedPriority`, `status`, `sort`
(`ticketNumber`|`createdAt`|`updatedAt`, default `createdAt`), `order`
(`asc`|`desc`, default `desc`), `page` (default 1), `pageSize` (default 10, max 50).

Invalid `page`/`pageSize`/`sort`/`order` values fall back to defaults rather than
erroring.

- 200:
```json
{
  "data": [ { "id": 42, "ticketNumber": "TKT-2026-000042", "summary": "...", "categoryId": 2, "requestedPriority": "MEDIUM", "itPriority": null, "currentStatus": "NEW", "createdAt": "...", "updatedAt": "..." } ],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 3, "totalPages": 1 }
}
```
- 401: missing/invalid requester

## GET /api/tickets/:id
Returns one ticket owned by the current requester, with attachment metadata.

- 200: ticket object (as in POST response) including `attachments: [{ id, originalFilename, mimeType, sizeBytes, uploadedAt, isRemoved, removedAt, removedReason }]`
- 404: ticket does not exist OR belongs to a different requester (BR-15 — never 403)
- 401: missing/invalid requester

## POST /api/tickets/:id/attachments
Adds an attachment to an existing owned ticket. `multipart/form-data`, field `file`.

- 201: `{ "id": 9, "originalFilename": "scan.pdf", "mimeType": "application/pdf", "sizeBytes": 120000, "uploadedAt": "...", "isRemoved": false }`
- 415: unsupported type
- 413: exceeds 5MB
- 409: `{ "error": "Ticket already has the maximum of 5 active attachments" }`
- 404: ticket not found / not owned
- 401: missing/invalid requester

## GET /api/tickets/:id/attachments
Lists attachment metadata (active and removed) for an owned ticket.

- 200: `[{ "id": 7, "originalFilename": "photo.jpg", "isRemoved": false, ... }]`
- 404: ticket not found / not owned
- 401: missing/invalid requester

## GET /api/attachments/:id/download
Streams the file for an active attachment on an owned ticket.

- 200: binary file stream with correct `Content-Type` and `Content-Disposition`
- 404: attachment not found, not owned, OR removed (BR-12 — removed attachments are
  never served)
- 401: missing/invalid requester

## DELETE /api/attachments/:id
Soft-removes an owned attachment.

Request body: `{ "reason": "Wrong file attached" }` (required, 3–200 chars).

- 200: `{ "id": 7, "isRemoved": true, "removedAt": "...", "removedReason": "Wrong file attached" }`
- 400: missing/invalid reason
- 404: attachment not found / not owned / already removed
- 401: missing/invalid requester

## Status Code Summary
| Status | Meaning |
|---|---|
| 200 | Successful read/update |
| 201 | Resource created |
| 400 | Validation failure (field-level) |
| 401 | Missing or invalid Development Requester header |
| 404 | Resource missing or not owned by current requester |
| 409 | Business-rule conflict (e.g. attachment limit reached) |
| 413 | Uploaded file exceeds size limit |
| 415 | Unsupported attachment MIME type |
| 500 | Unexpected server error (generic, safe message only) |
