# QUICKSTART — Deploy ACGF HR to Vercel + Neon

Goal: a live URL with a durable database, in ~10 minutes. No local installs needed.

## 0. Prerequisites
- A GitHub account with this `acgf-fullstack` folder pushed to a repo.
- A free Vercel account (sign in with GitHub).
- A free Neon account (https://neon.tech) — for durable data.

---

## 1. Create the Neon database (~2 min)
1. Log in to the Neon Console and create a project (any name/region). It comes with a
   database (default name `neondb`).
2. On the **Project Dashboard**, click the **Connect** button — this opens the
   "Connect to your database" modal.
3. Leave **Connection pooling** ON (the default). Copy the connection string. It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
   (Note the `-pooler` in the host — that's the pooled string you want for serverless.)
4. Keep this string handy for step 3.

---

## 2. Import the project into Vercel (~2 min)
1. Vercel dashboard → **Add New… → Project** → select your Git repo → **Import**.
2. **Root Directory** is the most important setting: it must point to the folder that
   contains `vercel.json`, the root `package.json`, and `api/`.
   - If this project sits in a subfolder of your repo (`<repo>/acgf-fullstack/...`), click
     **Edit** next to Root Directory and set it to `acgf-fullstack`.
   - If `vercel.json` is already at the repo root, leave it as is.
   (Pointing it at `server/` or `client/` causes "Missing script: build" / "No dist" errors.)
3. Framework Preset: **Other**. Leave Build Command and Output Directory blank — they come
   from `vercel.json` (build `npm run vercel-build`, output `dist`).
4. **Don't click Deploy yet** — add the env vars first (step 3 below).

---

## 3. Add environment variables (~2 min)
In the import screen (or later under **Settings → Environment Variables**), add:

| Name           | Value                                                        |
|----------------|--------------------------------------------------------------|
| `JWT_SECRET`   | any long random string (e.g. run `openssl rand -hex 32`)     |
| `DATABASE_URL` | the Neon pooled string from step 1.3                         |

Apply to **Production** (and Preview/Development if you use them). Then **Deploy**.

---

## 4. Verify (~1 min)
1. Open the deployment URL.
2. Try the employee experience: go to `/signup` and register with a seeded employee email
   such as `amara.bekele@acgf.com` (any password ≥ 8 chars). You'll be auto-linked to that
   employee record and land on **Payroll** showing only your own payslip; **Leave** lets you
   request time off for yourself. No other pages are visible.
3. Log in as admin: `admin@acgf.com` / `admin123` → full app. Admins create HR Directors and
   other users from Settings.

First boot auto-creates the tables and the admin account, then seeds demo HR data. No
employee logins are created by default — employees self-register (auto-linked by email).

---

## Alternative: one-click Neon via Vercel (skips steps 1 & 3's DATABASE_URL)
Instead of the manual steps, you can let Vercel provision Neon and inject the DB vars:
1. In your Vercel project → **Storage** tab → **Create / Connect Database** → choose **Neon**
   from the Marketplace → follow the prompts.
2. Vercel injects `DATABASE_URL` (and related vars) automatically — no copy/paste.
3. You still need to add **`JWT_SECRET`** yourself (step 3).

Important: use the manual path *or* the integration, not both. If you already set
`DATABASE_URL` by hand, remove it before installing the integration or the setup will
error on a conflicting variable.

---

## Notes
- No `VITE_API_URL` is needed — the client calls the same origin (`/api`).
- Without `DATABASE_URL` the app still runs but uses an ephemeral SQLite DB that resets on
  cold starts (fine only for a throwaway demo).
- To run locally instead: install Node 18+, then `npm install`, `npm run server`, and in a
  second terminal `npm run client` (http://localhost:5173).
