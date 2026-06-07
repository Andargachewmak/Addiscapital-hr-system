# Nexus HR — People Operations Platform

A modern, full-stack HR Management System built with **React 18 + TypeScript + Tailwind CSS + Supabase**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Styling | Tailwind CSS v3 (dark theme, custom design system) |
| Routing | React Router v6 |
| Server State | TanStack Query v5 (React Query) |
| Client State | Zustand v4 |
| Backend / DB | Supabase (PostgreSQL + RLS + RPCs) |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Build | Vite 5 |

---

## Features

- **Dashboard** — Live KPIs, headcount charts, activity feed, upcoming events
- **Employees** — Full directory with filtering, search, add/edit employees
- **Recruitment** — Job postings, hiring pipeline funnel, candidate tracking
- **Attendance & Leave** — Visual calendar, leave request approval workflow
- **Payroll** — Monthly processing, department breakdown, compensation records
- **Performance** — Score distribution, top performers, skill matrix, goals tracking
- **Analytics** — eNPS, turnover trends, diversity metrics, engagement radar

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-org/nexus-hr.git
cd nexus-hr
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** If you don't set these, the app runs in **mock data mode** automatically — great for development!

### 3. Set Up Supabase (Optional — skip for mock mode)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`
3. Copy your **Project URL** and **anon key** from Settings → API into `.env`

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
nexus-hr/
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, Header, Layout
│   │   ├── ui/              # Shared UI components (Button, Card, Table, Modal…)
│   │   ├── dashboard/       # Dashboard page
│   │   ├── employees/       # People directory + Add modal
│   │   ├── recruitment/     # Jobs + pipeline + candidates
│   │   ├── attendance/      # Calendar + leave requests
│   │   ├── payroll/         # Payroll records + charts
│   │   ├── performance/     # Reviews + goals + skill matrix
│   │   └── analytics/       # KPIs, charts, D&I metrics
│   ├── hooks/               # TanStack Query hooks (useEmployees, usePayroll…)
│   ├── lib/
│   │   ├── api.ts           # Supabase API layer (auto-falls back to mock)
│   │   ├── supabase.ts      # Supabase client
│   │   ├── database.types.ts # DB type definitions
│   │   ├── mock-data.ts     # Development mock data
│   │   └── utils.ts         # Helpers (formatCurrency, cn, avatarColor…)
│   ├── store/               # Zustand global state
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Router + QueryClient
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full DB schema + RLS + RPCs
├── tailwind.config.js
├── vite.config.ts
└── .env.example
```

---

## API Layer

All data access goes through `src/lib/api.ts`. It **automatically falls back** to mock data when `VITE_SUPABASE_URL` is not set.

```typescript
// Example: fetch employees with filters
const employees = await fetchEmployees({
  department: 'Engineering',
  status: 'active',
  search: 'tyler',
})

// Example: approve a leave request
await updateLeaveStatus(requestId, 'approved', approverId)
```

---

## Supabase Schema Highlights

- **Row Level Security** on all tables
- **Auto-increment** `applicant_count` via trigger when candidates are added
- **Generated column** `net_pay` computed from `base_salary + bonus - deductions`
- **RPC functions**: `get_dashboard_stats()`, `get_headcount_by_department()`, `get_monthly_headcount()`
- **Auto `updated_at`** trigger on all mutable tables

---

## Generating Fresh Supabase Types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

---

## Build for Production

```bash
npm run build
npm run preview
```

---

## Design System

| Token | Value |
|---|---|
| Font Display | Bricolage Grotesque |
| Font Body | DM Sans |
| Font Mono | JetBrains Mono |
| Primary | `#6C63FF` (brand-500) |
| Background | `#0a0b0f` (surface-0) |
| Surface 1 | `#111318` |
| Surface 2 | `#1a1c23` |

---

## License

MIT
