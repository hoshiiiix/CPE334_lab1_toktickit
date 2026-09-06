# Lab 2 Test Plan and Results — TokTickIT Requester Ticketing MVP

## 1. Test Strategy
Tests are planned from `specification.md` before implementation (Test DD), then
implemented and made to fail first for new behavior before it exists (TDD), and kept
green through refactors. Coverage spans unit, API, UI component, responsive/visual,
and end-to-end levels, per Lab 2 Section 9.2.

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator format | Matches `TKT-YYYY-000042` pattern, unique per call | `server/src/utils/ticketNumber.test.ts` | Pending |
| UNIT-02 | Unit | BR-01 | Ticket Number sequence resets per year | Sequence for a new year starts at `000001` even if the previous year ended higher | `server/src/utils/ticketNumber.test.ts` | Pending |
| API-13 | API | BR-01 | Concurrent ticket creation same year | No duplicate ticketNumber under simultaneous requests | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-01 | API | AC-01 | POST /api/tickets valid data | 201, ticket saved, ticketNumber returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-04, AC-05 | POST /api/tickets invalid summary/description | 400 with field-level errors | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | AC-06, AC-07 | Upload disallowed type / oversized file | 400 / 413 | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-04 | API | AC-08 | Add 6th attachment to a ticket with 5 active | 409 | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-05 | API | FR-04, AC-15 | GET /api/tickets scoped to requester | Only current requester's tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-06 | API | AC-10 | Search by ticket number substring | Only matches returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-07 | API | AC-11 | Filter by category | Only matching category returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-08 | API | AC-12 | Pagination page 2 | Correct slice + pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-09 | API | AC-03 | GET /api/tickets/:id cross-requester | 404, no data leaked | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-10 | API | AC-16, AC-17 | Download active vs. removed attachment | 200 with file / 404 | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-11 | API | AC-18 | DELETE /api/attachments/:id with reason | 200, isRemoved true, reason stored | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-12 | API | BR-16 | Request with inactive/unknown requester header | 401 | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| UI-01 | UI | AC-19 | Requester selector loading state | Spinner shown before options render | `client/.../DevRequesterSelect.test.tsx` | Pending |
| UI-02 | UI | AC-02 | No requester selected, navigate to My Tickets | Redirect to selection screen | `client/.../RouteGuard.test.tsx` | Pending |
| UI-03 | UI | AC-04 | Submit Create Ticket with empty Summary | Field message shown; API not called | `client/.../CreateTicket.test.tsx` | Pending |
| UI-04 | UI | BR-09 | Double-click submit | Button disabled after first click; one API call | `client/.../CreateTicket.test.tsx` | Pending |
| UI-05 | UI | AC-09 | API failure on submit | Safe error shown; field values preserved | `client/.../CreateTicket.test.tsx` | Pending |
| UI-06 | UI | AC-13, AC-14 | Empty vs. no-results states | Correct distinct message shown for each case | `client/.../MyTickets.test.tsx` | Pending |
| UI-07 | UI | AC-15 | Change Requester reloads list | Old requester's tickets disappear | `client/.../MyTickets.test.tsx` | Pending |
| UI-08 | UI | AC-18 | Attachment removal UI | Reason prompt required; removed badge shown after | `client/.../AttachmentSection.test.tsx` | Pending |
| RESP-01 | Responsive | Section 8.7 | My Tickets at 375/768/1200px | Card view / two-col / full table respectively | Playwright screenshot script | Pending |
| RESP-02 | Responsive | Section 8.7 | Create Ticket at 375px | Fields stacked, no horizontal scroll | Playwright screenshot script | Pending |
| E2E-01 | E2E | AC-01, AC-15 | Full flow: select requester, create ticket, find it in My Tickets | Ticket appears with correct number and data | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03 | Requester B cannot open Requester A's ticket by direct URL | Blocked / not found | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-16, AC-18 | Add, download, and remove an attachment end-to-end | Each step succeeds and UI reflects state | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |

## 3. Business-Rule Traceability (non-AC rules with dedicated tests)
| Rule | Covered By |
|---|---|
| BR-01 (Ticket Number format, yearly reset, uniqueness under concurrency) | UNIT-01, UNIT-02, API-13 |

## 4. Acceptance-Criterion Traceability
| AC | Covered By |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | UI-02 |
| AC-03 | API-09, E2E-02 |
| AC-04 | API-02, UI-03 |
| AC-05 | API-02 |
| AC-06 | API-03 |
| AC-07 | API-03 |
| AC-08 | API-04 |
| AC-09 | UI-05 |
| AC-10 | API-06 |
| AC-11 | API-07 |
| AC-12 | API-08 |
| AC-13 | UI-06 |
| AC-14 | UI-06 |
| AC-15 | API-05, UI-07, E2E-01 |
| AC-16 | API-10, E2E-03 |
| AC-17 | API-10 |
| AC-18 | API-11, UI-08, E2E-03 |
| AC-19 | UI-01 |
| AC-20 | RESP-01 |

## 5. Responsive and Visual Checklist
See `docs/lab-02/ui-spec.md` Section 16. Screenshots stored under
`artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/` at 375px,
768px, and 1280px widths.

## 6. Test Commands
```bash
# server
cd server && npm test

# client
cd client && npm test

# e2e (Playwright)
npx playwright test e2e/lab-02
```

## 7. Final Results
_Fill in after implementation: paste terminal output showing all tests passing on
the final `main` branch._

## 8. Known Limitations or Deferred Tests
_Fill in as they arise (e.g. load testing, non-English input, concurrent attachment
uploads) — document rather than silently skip._
