# Lab 3 — AI Use and Reflection

I used [NAME THE LLM/TOOL], with the same AI Specification Agent → AI Coding
Agent phases established in Lab 2.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Draft Specification | "Draft docs/lab-03/specification.md extending the Lab 2 contract: authentication, authorization, DevRequester→User migration, IT Staff workflow, and Administrator user management. Do not write code yet." | _fill in_ |
| Review Specification | "Act as a specification reviewer for specification.md. Report ambiguity in the status-transition matrix, missing failure states, and conflicts with the Lab 2 contract." | _fill in_ |
| Draft Test Plan | "Draft docs/lab-03/tests.md covering unit, API, UI, authorization, migration/regression, and E2E levels." | _fill in_ |
| Implement Authentication | "Implement login, logout, current-user, and mandatory password change per the approved contract. Migrate DevRequester rows into User with role=REQUESTER in place, keeping the same ids, without losing ticket ownership." | _fill in_ |
| Implement IT Staff Queue | "Implement GET /api/staff/tickets and the Ticket Queue screen with search/filter/sort/pagination, accessible to IT Staff and Administrator." | _fill in_ |
| Implement IT Staff Ticket Operations | "Implement claim/reassign ownership, IT Priority, permitted status transitions, Public Comments, and Internal Notes, enforcing the BR-12 transition matrix server-side." | _fill in_ |
| Implement Administrator User Management | "Implement the minimalist User Management screen and API per the contract, including the self-deactivation and last-Administrator safety rules." | _fill in_ |
| Completion Review | "Audit the implementation against every acceptance criterion and planned test, including direct API authorization checks for every protected endpoint. Report missing evidence before claiming completion." | _fill in_ |

## Reflection
_Write a short paragraph on how authorization testing changed your approach
compared to Lab 2 (testing forbidden access directly via API, not just hiding
UI), and what the in-place migration from DevRequester to User taught you about
evolving a schema without breaking existing data._
