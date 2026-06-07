# ACGF HR — Full-Stack HR Platform

A complete HR management web app: a **React + Vite** frontend talking to a **Node.js + Express REST API** backed by a **SQLite database**, with JWT authentication and a three-role access-control system.

```
acgf-fullstack/
├── client/   → React + Vite + TypeScript frontend
└── server/   → Node.js + Express REST API + SQLite (sql.js)
```

## Architecture

`Frontend (Vite)  ⇄  REST API (Express + JWT)  ⇄  SQLite database`

- **Auth:** JWT bearer tokens; passwords hashed with bcrypt.
- **Access control:** enforced on the server (route middleware → `403` if not allowed) and mirrored in the UI (hidden buttons, blocked pages, role-filtered navigation).
- **Database:** SQLite via `sql.js` (pure JavaScript, no native build step), stored at `server/data/acgf.sqlite` and auto-seeded on first run.

## Prerequisites

Node.js 18 or newer.

## Running it (two terminals)

**1 — Backend**
```bash
cd server
cp .env.example .env      # optional; the defaults already work
npm install
npm start                 # → http://localhost:4000/api  (creates + seeds the DB on first run)
```

**2 — Frontend**
```bash
cd client
npm install
npm run dev               # → http://localhost:5173
```
`client/.env` already points to the API (`VITE_API_URL=http://localhost:4000/api`).

Then open **http://localhost:5173** and sign in.

## Accounts

There is **one default account** — the System Admin. HR Directors and Employees must **create an account on the Sign Up page** before they can log in.

| Role         | Email          | Password   | How to get it        |
| ------------ | -------------- | ---------- | -------------------- |
| System Admin | admin@acgf.com | `admin123` | Built in (default)   |
| HR Director  | —              | —          | Sign Up (choose role)|
| Employee     | —              | —          | Sign Up (choose role)|

The admin can also create users directly in **Settings -> Team & roles**.

> Change the admin password and the `JWT_SECRET` before any real-world use.

## Roles & permissions (RBAC)

| Capability                                   | System Admin | HR Director | Employee        |
| -------------------------------------------- | :----------: | :---------: | :-------------: |
| View dashboard                               | ✓            | ✓           | ✓               |
| View employee directory                      | ✓            | ✓           | ✓ (read-only)   |
| Create / edit / delete employees             | ✓            | ✓           | ✗               |
| Submit leave request                         | ✓            | ✓           | ✓ (own)         |
| View leave requests                          | ✓ (all)      | ✓ (all)     | ✓ (own only)    |
| Approve / deny leave                         | ✓            | ✓           | ✗               |
| Recruitment (jobs & candidates)              | ✓            | ✓           | ✗ (hidden)      |
| View payroll                                 | ✓ (all)      | ✓ (all)     | ✓ (own only)    |
| Process payroll / export                     | ✓            | ✓           | ✗               |
| Performance reviews                          | ✓ (all)      | ✓ (all)     | ✓ (own only)    |
| Edit goal progress                           | ✓            | ✓           | ✗               |
| Analytics                                    | ✓            | ✓           | ✗ (hidden)      |
| Documents — view / download                  | ✓            | ✓           | ✓               |
| Documents — upload / delete                  | ✓            | ✓           | ✗               |
| User management (create users, assign roles) | ✓            | ✗           | ✗               |

The server is the source of truth: every protected route checks the caller's role and returns `403` when it isn't permitted. The UI simply reflects the same rules.

## REST API (summary)

```
POST   /api/auth/login            GET /api/auth/me
GET    /api/employees             POST/PATCH/DELETE /api/employees[/:id]
GET    /api/leave                 POST /api/leave        PATCH /api/leave/:id/status
GET    /api/jobs                  POST /api/jobs
GET    /api/candidates            PATCH /api/candidates/:id/stage
GET    /api/payroll               POST /api/payroll/process
GET    /api/performance/reviews   GET /api/performance/goals   PATCH /api/performance/goals/:id/progress
GET    /api/documents             POST/DELETE /api/documents[/:id]
GET    /api/users                 POST /api/users        (admin only)
GET    /api/dashboard             GET /api/health
```

All endpoints except `/auth/login` and `/health` require an `Authorization: Bearer <token>` header.

## Resetting the database

Stop the server, delete `server/data/acgf.sqlite`, and start again — it will recreate and reseed.

## Deploying

Host the API (set `PORT`, `JWT_SECRET`, and `CORS_ORIGIN` to your frontend URL), then build the client with `npm run build` and set its `VITE_API_URL` to the deployed API URL.
