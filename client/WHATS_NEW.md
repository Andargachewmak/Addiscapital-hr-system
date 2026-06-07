# What changed — sign-in + everything functional

The original Nexus HR app is preserved (same Vite + React + TypeScript + Tailwind + Supabase stack).
This pass added authentication and made every page's actions actually work. It also now
builds cleanly with `npm run build` (the original failed `tsc`).

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
```
No backend needed — without Supabase env vars the app runs in **demo mode** on mock data.

## Sign in
- A real `/login` page now gates the whole app (protected routes via `RequireAuth`).
- **Demo mode** (no Supabase configured): sign in with *any* email + a password of 4+ characters
  (or click the "Demo mode" hint on the login screen to auto-fill). Your name is derived from the email.
- **With Supabase**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, create a user in
  Supabase Auth, and the login uses `supabase.auth.signInWithPassword`. Sign-out lives in the header
  and sidebar user menus.

## Now functional (was dead before)
- **Auth** — login, persisted session (localStorage via Zustand), route guard, sign-out.
- **Header** — "Add Employee" opens the create form on the Employees page; the search box jumps to a
  filtered employee list; the notifications bell opens a real dropdown; the avatar opens a user menu with sign-out.
- **Employees** — add / edit / view / delete already worked; now also driven by the header shortcuts.
- **Recruitment** — "+ Post Job" opens a working create-job modal; each candidate has a stage selector
  that persists via the candidate-stage mutation.
- **Attendance** — "+ New Request" opens a working leave-request form (employee, type, dates, auto working-days);
  approve / deny on pending requests already worked.
- **Performance** — the Goals tab now has −/+ controls that update goal progress.
- **Payroll** — "Export CSV" downloads the current payroll records.
- **Dashboard** — the announcement banner and "View all" link now navigate.

## Build fixes (so `npm run build` passes)
- Added `src/vite-env.d.ts` (`import.meta.env` types).
- Made the Supabase client permissive so insert/update calls type-check.
- Marked nullable DB columns (`phone`, `avatar_url`, `manager_id`, `bio`, `skills`) as `string | null` in the `Employee` type.
- Made `<Th />` children optional.
