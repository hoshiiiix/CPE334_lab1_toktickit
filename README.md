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
