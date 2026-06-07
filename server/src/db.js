const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// Backend selection: if DATABASE_URL is set we use Postgres (e.g. Neon) for durable
// storage; otherwise we fall back to an in-process sql.js database (great for local
// dev / quick demos, but ephemeral on serverless).
async function initDb() {
  if (process.env.DATABASE_URL) return initPostgres()
  return initSqlite()
}

// ── Schema (idempotent; shared by both backends) ────────────────────
// `?` placeholders are used everywhere; the Postgres layer rewrites them to $1..$n.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT,
    role TEXT CHECK(role IN ('admin','hr_director','employee')), employee_id TEXT
  );
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT,
    first_name TEXT, last_name TEXT, email TEXT UNIQUE, phone TEXT, avatar_url TEXT,
    department TEXT, job_title TEXT, employment_type TEXT, status TEXT,
    location TEXT, start_date TEXT, salary REAL, manager_id TEXT, bio TEXT, skills TEXT
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY, employee_id TEXT, leave_type TEXT, start_date TEXT, end_date TEXT,
    days INTEGER, reason TEXT, status TEXT, approved_by TEXT, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY, title TEXT, department TEXT, location TEXT, employment_type TEXT,
    description TEXT, requirements TEXT, salary_min REAL, salary_max REAL, status TEXT,
    applicant_count INTEGER, created_at TEXT, updated_at TEXT, recruiter_id TEXT
  );
  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY, job_id TEXT, first_name TEXT, last_name TEXT, email TEXT, phone TEXT,
    stage TEXT, score REAL, notes TEXT, created_at TEXT, updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY, employee_id TEXT, period_start TEXT, period_end TEXT,
    base_salary REAL, bonus REAL, deductions REAL, net_pay REAL, status TEXT,
    processed_at TEXT, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS performance_reviews (
    id TEXT PRIMARY KEY, employee_id TEXT, reviewer_id TEXT, period TEXT, score REAL,
    goals_score REAL, skills_score REAL, culture_score REAL, comments TEXT, status TEXT, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, employee_id TEXT, title TEXT, description TEXT, target_date TEXT,
    progress INTEGER, status TEXT, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, name TEXT, type TEXT, owner TEXT, size TEXT, updated_at TEXT,
    file_data TEXT, file_mime TEXT
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY, employee_id TEXT, date TEXT,
    status TEXT CHECK(status IN ('present','absent')), created_at TEXT,
    UNIQUE(employee_id, date)
  );
  CREATE TABLE IF NOT EXISTS experience_letters (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'pending',
    purpose TEXT,
    start_date TEXT,
    end_date TEXT,
    approved_by TEXT,
    approved_at TEXT,
    rejection_reason TEXT,
    letter_content TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

// ── Postgres backend (Neon-compatible) ──────────────────────────────
async function initPostgres() {
  const { Pool } = require('pg')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon and most hosted Postgres require SSL. Set PGSSL=disable to turn off.
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX) || 3,
  })

  // Translate sql.js style `?` placeholders into Postgres `$1..$n`.
  const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`) }

  const all = async (sql, params = []) => (await pool.query(toPg(sql), params)).rows
  const get = async (sql, params = []) => { const r = await pool.query(toPg(sql), params); return r.rows[0] || null }
  const run = async (sql, params = []) => { await pool.query(toPg(sql), params) }
  const persist = async () => {} // no-op: Postgres is already durable

  // Run each CREATE statement separately — robust across drivers/poolers.
  for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await run(stmt)

  // Seed once, even if several serverless instances cold-start at the same time.
  // A transaction-scoped advisory lock serializes the check-and-seed so only one wins.
  const seededTransactionally = await (async () => {
    const client = await pool.connect()
    const c = (sql, p = []) => client.query(toPg(sql), p)
    try {
      await c('BEGIN')
      await c('SELECT pg_advisory_xact_lock(727274)')
      const r = await c('SELECT COUNT(*) AS cnt FROM users')
      if (Number(r.rows[0].cnt) === 0) {
        await seed({
          all: async (s, p = []) => (await c(s, p)).rows,
          get: async (s, p = []) => (await c(s, p)).rows[0] || null,
          run: async (s, p = []) => { await c(s, p) },
        })
      }
      await c('COMMIT')
      return true
    } catch {
      try { await c('ROLLBACK') } catch { /* ignore */ }
      return false // advisory locks unsupported (e.g. emulator) → fall back below
    } finally {
      client.release()
    }
  })()
  if (!seededTransactionally) {
    const u = await get('SELECT COUNT(*) AS cnt FROM users')
    if (!u || Number(u.cnt) === 0) await seed({ all, get, run })
  }

  return { all, get, run, persist, uid, now }
}

// ── sql.js (SQLite) fallback backend ────────────────────────────────
async function initSqlite() {
  const initSqlJs = require('sql.js')
  // On Vercel the project files are read-only; only /tmp is writable (and ephemeral,
  // so seed data resets on cold starts). Locally we persist under server/data.
  const DB_FILE = process.env.DB_FILE
    || (process.env.VERCEL ? '/tmp/acgf.sqlite' : path.join(__dirname, '..', 'data', 'acgf.sqlite'))

  // Resolve the wasm explicitly so it works both locally and when bundled by Vercel.
  const SQL = await initSqlJs({
    locateFile: (file) => {
      try { return require.resolve(`sql.js/dist/${file}`) } catch { return file }
    },
  })

  const exists = fs.existsSync(DB_FILE)
  const db = exists ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_FILE))) : new SQL.Database()

  const persist = () => fs.writeFileSync(DB_FILE, Buffer.from(db.export()))
  const all = async (sql, params = []) => {
    const stmt = db.prepare(sql); stmt.bind(params)
    const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); stmt.free()
    return rows
  }
  const get = async (sql, params = []) => (await all(sql, params))[0] || null
  const run = async (sql, params = []) => { db.run(sql, params); persist() }

  db.run(SCHEMA) // idempotent — safe on both fresh and existing databases
  persist()
  if (!exists) await seed({ all, get, run })

  return { all, get, run, persist, uid, now }
}

// ── Seed data — clean start: only the default admin account ─────────
// No demo employees or data are created. Employees appear in the directory when they
// register (a record is created on sign-up), and admins can add employees and create
// users from Settings. Default admin: admin@acgf.com / admin123
async function seed({ run }) {
  await run(
    `INSERT INTO users (id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,?)`,
    [uid(), 'System Admin', 'admin@acgf.com', bcrypt.hashSync('admin123', 10), 'admin', null]
  )
}

module.exports = { initDb }
