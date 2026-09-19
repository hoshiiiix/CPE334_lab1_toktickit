# Lab 3 Test Plan and Results — TokTickIT Users, Roles, IT Staff, Admin

## 1. Test Strategy
Same Test DD/TDD approach as Lab 2. Coverage spans unit, API/integration, UI
component, security/authorization, migration/regression, responsive, and E2E.
Authorization is tested at the API level for every protected endpoint — a
passing UI test alone is never treated as proof of a security control.

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | 200, session cookie set, correct role/mustChangePassword | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-02 | API | AC-02 | Invalid password / inactive account | 401, identical generic message for both cases | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-03 | API | BR-07 | 6th failed login attempt within 15 min | 429 | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-04 | API | AC-03, BR-02 | Access a normal endpoint while mustChangePassword=true | 403 | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-05 | API | — | POST /api/auth/change-password success | 200, mustChangePassword becomes false | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-06 | API | AC-04, BR-03 | Requester sends foreign requesterId | Backend ignores it; session identity used | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-07 | API | AC-05, BR-04 | Requester requests Internal Notes | 403, no note content in body | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-08 | API | AC-12 | Requester calls /api/admin/users and /api/staff/tickets | 403 on both | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-08b | API | AC-06 | Administrator calls /api/staff/tickets | 200 (Administrator has staff access) | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-09 | API | AC-06 | GET /api/staff/tickets search/filter/sort/pagination (IT Staff and Administrator) | Correct cross-requester results and metadata for both roles | `server/tests/lab-03/staff-queue.api.test.ts` | Pending |
| API-10 | API | AC-07 | Claim an unassigned ticket | ticketOwnerId set to caller | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-11 | API | AC-08, BR-12 | Illegal status transition | 409 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-12 | API | BR-11 | Requester attempts to change itPriority | 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-13 | API | AC-09 | Requester marks own ticket resolved | requesterMarkedResolved true, currentStatus unchanged | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-14 | API | BR-13 | Post empty/whitespace-only comment | 400 | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-15 | API | AC-10 | Create user with duplicate email | 400, field-level error | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-16 | API | AC-11, BR-16 | Sole active Administrator deactivates self | 400, rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-17 | API | — | Admin resets a user's password | mustChangePassword becomes true for target | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-18 | API | AC-14 | Migrated DevRequester tickets remain correctly owned, same ids | Ticket.requesterId unchanged and valid | `server/tests/lab-03/migration.api.test.ts` | Pending |
| API-19 | API | AC-15 | Session older than 7 days | 401, must log in again | `server/tests/lab-03/auth.api.test.ts` | Pending |
| REGRESSION-01 | API | DoD | Full Lab 2 API test suite re-run post-migration | All Lab 2 tests still pass | `server/tests/lab-02/*.test.ts` | Pending |
| UI-01 | UI | AC-01, AC-02 | Login form: success and error states | Correct redirect / error banner | `client/tests/lab-03/Login.test.tsx` | Pending |
| UI-02 | UI | AC-03 | Change Password: live rule checklist | Continue disabled until all rules pass | `client/tests/lab-03/ChangePassword.test.tsx` | Pending |
| UI-03 | UI | AC-06 | Ticket Queue renders, search/filter (IT Staff and Administrator sessions) | Results and empty/no-results states correct for both roles | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pending |
| UI-04 | UI | AC-07, AC-08 | Ticket Detail claim + status dropdown | Owner updates; illegal transitions not listed | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pending |
| UI-05 | UI | BR-04 | Public Comments vs Internal Notes visual distinction | Correct panel styling/labels rendered | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pending |
| UI-06 | UI | AC-10, AC-11 | User Management create/edit validation | Field errors and disabled-deactivate states shown | `client/tests/lab-03/UserManagement.test.tsx` | Pending |
| RESP-01 | Responsive | §10 | Login/Queue/Ticket Detail/Admin at 375/768/1200px | Correct responsive layout at each | Manual (documented) | Pending |
| E2E-01 | E2E | AC-01..03 | Full login → forced password change → app access | Reaches app only after valid change | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-02 | E2E | AC-07, AC-09 | IT Staff claims ticket, sets status, posts comment; Requester marks resolved | Full cross-role workflow succeeds | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-10, AC-11 | Admin creates a user, edits it, attempts self-deactivation | User created/edited; self-deactivation blocked | `e2e/lab-03/user-administration.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability
| AC | Covered By |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-02, UI-01 |
| AC-03 | API-04, UI-02, E2E-01 |
| AC-04 | API-06 |
| AC-05 | API-07 |
| AC-06 | API-08b, API-09, UI-03 |
| AC-07 | API-10, UI-04, E2E-02 |
| AC-08 | API-11, UI-04 |
| AC-09 | API-13, E2E-02 |
| AC-10 | API-15, UI-06, E2E-03 |
| AC-11 | API-16, UI-06, E2E-03 |
| AC-12 | API-08 |
| AC-14 | API-18 |
| AC-15 | API-19 |

## 4. Responsive and Visual Checklist
See `docs/lab-03/ui-spec.md` §11. Screenshots under
`artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/`.

## 5. Test Commands
```bash
cd server && npm test
cd client && npm test
npx playwright test e2e/lab-03
```

## 6. Final Results
_Fill in after implementation with real terminal output, as done for Lab 2._

## 7. Known Limitations or Deferred Tests
_Document honestly, following the same pattern established in Lab 2's tests.md —
this was noted positively in Lab 2 review._
