# TokTickIT — Lab 1: Full-Stack Hello World Starter

IT service desk app proving the stack works end-to-end:
React (Vite + TypeScript + Bootstrap) → Express (TypeScript) → Prisma → PostgreSQL.

## Tech stack
Frontend: React + TypeScript + Vite + Bootstrap · Backend: Node.js + Express + TypeScript
Database: PostgreSQL + Prisma · Testing: Vitest + Supertest

## Setup

### Database & backend
```bash
cd server
cp .env.example .env      # edit DATABASE_URL for your local PostgreSQL
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev                # http://localhost:3000
```
Run backend tests: `npm test`

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```
Run frontend tests: `npm test`

## Usage
1. Start PostgreSQL, then `npm run dev` in `server/`.
2. `npm run dev` in `client/`.
3. Open http://localhost:5173 and click **Check System**.
   - Success: "System Status: Online" + the four categories.
   - Failure (backend/DB down): "System Status: Offline" + error message.

See `docs/lab-01/` for the AI usage log, test plan, and peer review record.

## Lab 2

### Migrations & Seed
```bash
cd server
npm run prisma:migrate
npm run prisma:seed
```

### Running the App
```bash
# Terminal 1 — backend (port 3000)
cd server
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm run dev
```

### Running the Tests
```bash
# Server unit/API tests
cd server
npm test

# Client component tests
cd client
npm test

# End-to-end tests (Desktop/Tablet/Mobile, requires backend + frontend running
# and a freshly seeded database)
npx playwright test e2e/lab-02
```

### Documentation
See [`docs/lab-02/`](docs/lab-02/) for the full specification, UI spec, test plan
and results, AI usage log, and reviewer notes.

## Lab 3 — Users, Roles, IT Staff Ticketing and Admin Screens

### Migrations & Seed
```bash
cd server
npm run prisma:migrate     # applies the Lab 3 migration (DevRequester -> User, same ids)
npm run prisma:seed        # idempotent: safe to run repeatedly
```

### Local development accounts (seed data)
> **For local development only.** These credentials exist solely in a developer's
> local database. Never reuse them anywhere else and never commit real passwords.

All seeded accounts use the password `DevPass123!`.

| Role | Active accounts | Inactive account |
|---|---|---|
| Requester | jennifer.anderson@example.com, michael.brown@example.com, sarah.johnson@example.com, david.lee@example.com | inactive.user@example.com |
| IT Staff | emily.davis@example.com, kevin.patel@example.com, lisa.martinez@example.com | robert.wilson@example.com |
| Administrator | john.smith@example.com | — |

Accounts created by an Administrator start with `mustChangePassword = true`: the user
must choose a new password at first login before reaching the application.

### Running the Tests
```bash
cd server && npm test                  # API / integration tests (needs the local PostgreSQL)
cd client && npm test                  # component tests

# End-to-end (Desktop/Tablet/Mobile). Needs the server on :3000, the client on :5173
# and a seeded database. Screenshots are written to artifacts/lab-03/screenshots/.
npx playwright test e2e/lab-02 e2e/lab-03
```

### Documentation
See [`docs/lab-03/`](docs/lab-03/) for the specification, UI spec, API spec, test plan,
AI usage log and reviewer notes.
