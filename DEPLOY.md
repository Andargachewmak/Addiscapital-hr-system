# Deploying to Vercel

One Vercel project: the Vite client is served as static files and the Express API
runs as a serverless function under `/api`.

## Deploy
1. Push this folder (`acgf-fullstack`) to a Git repo and import it in Vercel,
   **or** run `vercel` from this folder with the Vercel CLI.
2. Set the **Root Directory** to `acgf-fullstack` if it isn't already the repo root.
3. Build/Output come from `vercel.json` (build `npm run vercel-build`, output `dist`);
   `/api/*` is routed to `api/index.js`, everything else falls back to the SPA.
   Leave the dashboard's Framework Preset as **Other** and don't override Build Command or
   Output Directory — `vercel.json` handles them.
4. Add environment variables in Vercel → Settings → Environment Variables:
   - **`JWT_SECRET`** — any long random string (required for stable sessions).
   - **`DATABASE_URL`** — your Neon Postgres connection string (see below) for durable data.

No `VITE_API_URL` is needed — the client calls the same origin (`/api`).

## Database — durable storage with Neon
The API auto-selects its backend:
- **`DATABASE_URL` set** → Postgres (Neon). Durable. **Use this in production.**
- **Not set** → in-process SQLite (`sql.js`). Fine for local/demo, but on Vercel it lives
  in `/tmp` and is **ephemeral** (resets on cold starts).

Set up Neon:
1. Create a free Postgres database at https://neon.tech.
2. Copy the **pooled** connection string (looks like
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/DB?sslmode=require`).
3. Add it in Vercel as `DATABASE_URL` (SSL is on by default; set `PGSSL=disable` only for
   a local non-SSL Postgres).
4. Redeploy. On first boot the app creates its tables and seeds demo data automatically;
   afterwards it leaves existing data untouched.

The schema and seed are backend-agnostic — the same code runs on both SQLite and Postgres
(`server/src/db.js`).

## Roles & access
- **Employees** are scoped to **Payroll** (their own payslips only) and **Leave**
  (request/view their own only). All other pages and nav are hidden/blocked for them;
  the server also filters every payroll/leave/attendance/performance query to their own
  records and forces leave requests to their own ID.
- **HR Director / Admin** see the full app.

To give employees more (e.g. re-enable Settings), loosen the route guards in
`client/src/App.tsx` and `navAllowed()` in `client/src/components/layout/Sidebar.tsx`.

## Demo login (seeded)
- Admin: `admin@acgf.com` / `admin123`

No employee accounts are created by default. To try the employee experience, sign up at
`/signup` — public sign-up always creates an **Employee**, and if the email matches an
existing employee record the login is auto-linked so they immediately see their own
payroll/leave. The seeded employee records include `amara.bekele@acgf.com` and
`liam.okafor@acgf.com`, so registering with one of those emails links you to that person's
data. Admins can also create users (including HR Directors) from Settings.

## Local development
- API:    `npm run server`   (http://localhost:4000; uses SQLite unless DATABASE_URL is set)
- Client: `npm run client`   (http://localhost:5173, proxies `/api` to the API)

## Security & hardening notes
- **JWT_SECRET is mandatory in production.** The API refuses to start on Vercel without a
  strong secret (>= 32 chars), preventing forged tokens. Locally it auto-generates an
  ephemeral one if unset.
- **Role enforcement is server-side.** Employees can only read their own payroll, leave,
  and attendance; HR-only endpoints (dashboard, employees directory, recruitment,
  performance, documents, users) return 403 for them — the UI lockdown is backed by the API.
- **No salary leakage.** Employee objects embedded in leave/payroll responses are
  salary-stripped; an employee can't read a colleague's pay through an approver/record embed.
- **Input validation** on auth, users, employees, and leave (email format, password length
  >= 8, valid leave types/statuses/dates). Emails are normalized (trimmed + lowercased).
- **Standard protections:** `helmet` security headers, `x-powered-by` disabled, 1 MB JSON
  body limit, `trust proxy` for correct client IPs, and a basic per-instance rate limiter on
  `/api/auth/*`. For a high-traffic/high-security deployment, back the limiter with a shared
  store (e.g. Redis) since serverless instances don't share memory.
- **Seeding is concurrency-safe** on Postgres (advisory lock), so simultaneous cold starts
  won't double-seed.

## Troubleshooting deploys
**"Missing script: build" / "No Output Directory named 'dist'"** — almost always the
**Root Directory** is wrong, so Vercel is building the wrong folder (e.g. `server/`, which
has no build script).
- The folder containing `vercel.json`, the root `package.json`, and `api/` must be the
  project's Root Directory.
- If you pushed this project as a subfolder (`<repo>/acgf-fullstack/...`), set
  **Settings → Build & Deployment → Root Directory = `acgf-fullstack`**.
- If `vercel.json` is at the repository root, leave Root Directory empty (`.`).
- Set **Framework Preset = Other**. Don't manually set Build Command or Output Directory in
  the dashboard — let `vercel.json` drive them (build `npm run vercel-build`, output `dist`).
- The build outputs to a top-level `dist/` at the project root; both `npm run build` and
  `npm run vercel-build` are provided, so either works if Vercel picks the default command.

After fixing the Root Directory, redeploy (optionally clear the build cache).
