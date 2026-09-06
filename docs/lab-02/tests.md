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
| API-13 | API | BR-01 | Concurrent ticket creation same year | No duplicate ticketNumber under simultaneous requests | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-01 | API | AC-01 | POST /api/tickets valid data | 201, ticket saved, ticketNumber returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-02 | API | AC-04, AC-05 | POST /api/tickets invalid summary/description | 400 with field-level errors | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-03 | API | AC-06, AC-07 | Upload disallowed type / oversized file | 400 / 413 | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-04 | API | AC-08 | Add 6th attachment to a ticket with 5 active | 409 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-05 | API | FR-04, AC-15 | GET /api/tickets scoped to requester | Only current requester's tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-06 | API | AC-10 | Search by ticket number substring | Only matches returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-07 | API | AC-11 | Filter by category | Only matching category returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-08 | API | AC-12 | Pagination page 2 | Correct slice + pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-09 | API | AC-03 | GET /api/tickets/:id cross-requester | 404, no data leaked | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-10 | API | AC-16, AC-17 | Download active vs. removed attachment | 200 with file / 404 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-11 | API | AC-18 | DELETE /api/attachments/:id with reason | 200, isRemoved true, reason stored | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-12 | API | BR-16 | Request with inactive/unknown requester header | 401 | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| UI-01 | UI | AC-19 | Requester selector loading state | Spinner shown before options render | `client/.../DevRequesterSelect.test.tsx` | Pass |
| UI-02 | UI | AC-02 | No requester selected, navigate to My Tickets | Redirect to selection screen | `client/.../RouteGuard.test.tsx` | Pending |
| UI-03 | UI | AC-04 | Submit Create Ticket with empty Summary | Field message shown; API not called | `client/.../CreateTicket.test.tsx` | Pass |
| UI-04 | UI | BR-09 | Double-click submit | Button disabled after first click; one API call | `client/.../CreateTicket.test.tsx` | Pass |
| UI-05 | UI | AC-09 | API failure on submit | Safe error shown; field values preserved | `client/.../CreateTicket.test.tsx` | Pass |
| UI-06 | UI | AC-13, AC-14 | Empty vs. no-results states | Correct distinct message shown for each case | `client/.../MyTickets.test.tsx` | Pass |
| UI-07 | UI | AC-15 | Change Requester reloads list | Old requester's tickets disappear | `client/.../MyTickets.test.tsx` | Pass |
| UI-08 | UI | AC-18 | Attachment removal UI | Reason prompt required; removed badge shown after | `client/.../AttachmentSection.test.tsx` | Pending |
| RESP-01 | Responsive | Section 8.7 | My Tickets at 375/768/1200px | Card view / two-col / full table respectively | Playwright screenshot script | Pending (manual only) |
| RESP-02 | Responsive | Section 8.7 | Create Ticket at 375px | Fields stacked, no horizontal scroll | Playwright screenshot script | Pending (manual only) |
| E2E-01 | E2E | AC-01, AC-15 | Full flow: select requester, create ticket, find it in My Tickets | Ticket appears with correct number and data | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-02 | E2E | AC-03 | Requester B cannot open Requester A's ticket by direct URL | Blocked / not found | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-03 | E2E | AC-16, AC-18 | Add, download, and remove an attachment end-to-end | Each step succeeds and UI reflects state | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending (not implemented in spec) |

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

### Server (`cd server && npm test`)

toktickit-server@1.0.0 test
vitest run

RUN v2.1.9 /home/xavier/repoGIT/CPE334_lab1_toktickit/server

✓ tests/lab-01/health.test.ts (1 test) 33ms
✓ tests/lab-01/categories.test.ts (1 test) 131ms
✓ tests/lab-02/ticket-detail.api.test.ts (3 tests) 258ms
✓ tests/lab-02/create-ticket.api.test.ts (5 tests) 307ms
✓ tests/lab-02/my-tickets.api.test.ts (4 tests) 341ms
✓ tests/lab-02/attachments.api.test.ts (5 tests) 482ms

Test Files 6 passed (6)
Tests 19 passed (19)
Start at 00:36:44
Duration 1.41s

### Client (`cd client && npm test`)

toktickit-client@1.0.0 test
vitest run

RUN v2.1.9 /home/xavier/repoGIT/CPE334_lab1_toktickit/client

✓ tests/lab-02/MyTickets.test.tsx (3 tests) 177ms
✓ tests/lab-02/DevRequesterSelect.test.tsx (4 tests) 229ms
✓ tests/lab-02/RequesterTicketDetail.test.tsx (3 tests) 326ms
✓ tests/lab-02/CreateTicket.test.tsx (3 tests) 391ms

Test Files 4 passed (4)
Tests 13 passed (13)
Start at 00:36:57
Duration 1.97s


### E2E (`npx playwright test e2e/lab-02`)
6/6 passed across Desktop/Tablet/Mobile projects (2 test scenarios × 3 viewports),
after fixing viewport-specific selectors (table row vs. card/link layout) and
using a timestamped ticket title to avoid collisions across parallel runs.


## 8. Known Limitations or Deferred Tests

1. **UNIT-01/UNIT-02 (Ticket Number generator unit tests) not implemented.**
   `server/src/utils/ticketNumber.test.ts` does not exist; the format and yearly-reset
   logic are only indirectly exercised via API-13/API-01 integration tests, not
   isolated unit tests.
2. **UI-02 (route guard redirect) not implemented.** `RouteGuard.test.tsx` was not
   found/run; unauthenticated navigation to My Tickets is untested at the unit level
   (though manually verified to work during E2E runs).
3. **UI-08 (attachment removal UI) coverage unclear.** The planned
   `AttachmentSection.test.tsx` was not run; `RequesterTicketDetail.test.tsx` ran
   instead, but it isn't confirmed to cover the "Removed" badge and reason-prompt
   behavior specifically. Left as Pending rather than assumed passing.
4. **E2E-03 (attachment add/download/remove) not covered end-to-end.** The current
   `requester-ticket-flow.spec.ts` only covers ticket creation/lookup and
   cross-requester access blocking (2 scenarios). Attachment lifecycle is only
   covered at the API level (API-04, API-10, API-11), not through the UI end-to-end.
5. **RESP-01/RESP-02 done manually, not as an automated script.** Responsive
   screenshots (375/768/1280px) were captured by hand via Firefox's responsive
   design mode rather than a Playwright screenshot script, so this check will not
   re-run automatically in CI and must be redone manually if the UI changes.
6. **Mobile header navigation bug found during visual inspection** (see
   `docs/lab-02/ui-spec.md` Section 16): at 375px, "Create Ticket" and the requester
   name visually overlap because the header doesn't collapse into a hamburger menu
   as specified in Section 10. Not covered by any automated test — purely caught by
   manual screenshot review.
7. **Load/performance testing not covered.** No test validates behavior under
   concurrent load beyond the single concurrency check in API-13.
