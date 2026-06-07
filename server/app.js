const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const bcrypt = require('bcryptjs')
const { initDb } = require('./src/db')
const { signToken, requireAuth, requireRole } = require('./src/auth')

const HR = ['admin', 'hr_director'] // roles allowed to manage HR data
const LEAVE_TYPES = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid']
const LEAVE_STATUSES = ['pending', 'approved', 'denied', 'cancelled']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normEmail = (e) => String(e || '').trim().toLowerCase()

// Builds and returns the configured Express app. Async because the DB inits async.
// Used by both the local dev server (index.js) and the Vercel serverless entry (api/index.js).
async function createApp() {
  // all/get/run are async (real async on Postgres; trivially awaitable on the sql.js fallback).
  const { all, get, run, uid, now } = await initDb()
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // correct client IPs behind Vercel's proxy
  app.use(helmet())
  // Token-based API (no cookies), so reflecting the request origin is safe. Lock it down
  // with CORS_ORIGIN (comma-separated) when you know your front-end origin(s).
  app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }))
  app.use(express.json({ limit: '1mb' }))

  // Wrap async handlers so a rejected promise becomes a clean 500 instead of crashing.
  const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e)
    if (!res.headersSent) res.status(500).json({ message: 'Server error' })
  })

  // Lightweight in-memory fixed-window rate limiter for sensitive endpoints. Note: on
  // serverless this is per-instance and resets on cold starts — a basic guard, not a
  // substitute for a shared store (e.g. Redis) in a high-security deployment.
  const rateLimit = ({ windowMs, max }) => {
    const hits = new Map()
    return (req, res, next) => {
      const key = `${req.ip}:${req.path}`
      const t = Date.now()
      const e = hits.get(key)
      if (!e || t > e.reset) hits.set(key, { count: 1, reset: t + windowMs })
      else if (++e.count > max) {
        return res.status(429).json({ message: 'Too many attempts. Please try again later.' })
      }
      if (hits.size > 5000) for (const [k, v] of hits) if (t > v.reset) hits.delete(k)
      next()
    }
  }
  const authLimiter = rateLimit({ windowMs: 5 * 60_000, max: 20 })

  // ── shaping helpers ────────────────────────────────────────────────
  const shapeEmp = (r) => r && ({ ...r, skills: r.skills ? JSON.parse(r.skills) : [], full_name: `${r.first_name} ${r.last_name}` })
  const stripSalary = (e) => { if (!e) return e; const { salary, ...rest } = e; return rest }
  // Embedded employee objects (on leave/payroll/etc.) never need salary — strip it so an
  // employee can't read a colleague's pay via an approver/record embed.
  const pubEmp = (r) => stripSalary(shapeEmp(r))
  const empMap = async () => { const m = {}; for (const e of await all('SELECT * FROM employees')) m[e.id] = pubEmp(e); return m }

  // ── health ─────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: now() }))

  // ── auth ───────────────────────────────────────────────────────────
  app.post('/api/auth/login', authLimiter, h(async (req, res) => {
    const email = normEmail((req.body || {}).email)
    const { password } = req.body || {}
    const u = await get('SELECT * FROM users WHERE email = ?', [email])
    if (!u || !bcrypt.compareSync(password || '', u.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    const user = { id: u.id, name: u.name, email: u.email, role: u.role, employee_id: u.employee_id }
    res.json({ token: signToken(user), user })
  }))
  app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user))
  app.post('/api/auth/register', authLimiter, h(async (req, res) => {
    const name = String((req.body || {}).name || '').trim()
    const email = normEmail((req.body || {}).email)
    const { password } = req.body || {}
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' })
    if (name.length > 100) return res.status(400).json({ message: 'Name is too long' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' })
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
    if (await get('SELECT id FROM users WHERE email = ?', [email])) return res.status(409).json({ message: 'An account with this email already exists' })
    // Public sign-up is always Employee. HR Directors & Admins are created by an admin.
    const role = 'employee'
    const id = uid()
    // If HR has already added an employee with this email, link the login to that record so
    // the person gets the full employee experience (own payroll, performance, etc.).
    // Otherwise they sign up as an applicant: no employee record, and they can only browse
    // and apply to open roles until HR adds them as an employee.
    const emp = await get('SELECT id FROM employees WHERE email = ?', [email])
    const employee_id = emp ? emp.id : null
    await run('INSERT INTO users (id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,?)',
      [id, name, email, bcrypt.hashSync(password, 10), role, employee_id])
    const user = { id, name, email, role, employee_id }
    res.status(201).json({ token: signToken(user), user })
  }))

  // ── users (admin only) ─────────────────────────────────────────────
  app.get('/api/users', requireAuth, requireRole('admin'), h(async (_req, res) => {
    res.json(await all('SELECT id,name,email,role,employee_id FROM users'))
  }))
  app.post('/api/users', requireAuth, requireRole('admin'), h(async (req, res) => {
    const name = String((req.body || {}).name || '').trim()
    const email = normEmail((req.body || {}).email)
    const { password, role, employee_id } = req.body || {}
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' })
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
    if (!['admin', 'hr_director', 'employee'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
    if (await get('SELECT id FROM users WHERE email=?', [email])) return res.status(409).json({ message: 'Email already exists' })
    const id = uid()
    await run('INSERT INTO users (id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,?)',
      [id, name, email, bcrypt.hashSync(password, 10), role, employee_id || null])
    res.status(201).json({ id, name, email, role, employee_id: employee_id || null })
  }))
  app.patch('/api/users/:id', requireAuth, requireRole('admin'), h(async (req, res) => {
    const existing = await get('SELECT * FROM users WHERE id=?', [req.params.id])
    if (!existing) return res.status(404).json({ message: 'User not found' })
    const b = req.body || {}
    const name = b.name !== undefined ? String(b.name).trim() : existing.name
    const email = b.email !== undefined ? normEmail(b.email) : existing.email
    const role = b.role !== undefined ? b.role : existing.role
    if (!name) return res.status(400).json({ message: 'Name is required' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' })
    if (!['admin', 'hr_director', 'employee'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
    if (await get('SELECT id FROM users WHERE email=? AND id<>?', [email, req.params.id])) {
      return res.status(409).json({ message: 'Email already exists' })
    }
    // Don't allow demoting the last remaining admin (avoids lockout).
    if (existing.role === 'admin' && role !== 'admin') {
      const admins = await get("SELECT COUNT(*) AS c FROM users WHERE role='admin'")
      if (Number(admins.c) <= 1) return res.status(400).json({ message: 'Cannot change the role of the last admin' })
    }
    const employee_id = b.employee_id !== undefined ? (b.employee_id || null) : existing.employee_id
    let password_hash = existing.password_hash
    if (b.password) {
      if (String(b.password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
      password_hash = bcrypt.hashSync(b.password, 10)
    }
    await run('UPDATE users SET name=?,email=?,role=?,employee_id=?,password_hash=? WHERE id=?',
      [name, email, role, employee_id, password_hash, req.params.id])
    res.json({ id: req.params.id, name, email, role, employee_id })
  }))
  app.delete('/api/users/:id', requireAuth, requireRole('admin'), h(async (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' })
    const existing = await get('SELECT * FROM users WHERE id=?', [req.params.id])
    if (!existing) return res.status(404).json({ message: 'User not found' })
    if (existing.role === 'admin') {
      const admins = await get("SELECT COUNT(*) AS c FROM users WHERE role='admin'")
      if (Number(admins.c) <= 1) return res.status(400).json({ message: 'Cannot delete the last admin' })
    }
    await run('DELETE FROM users WHERE id=?', [req.params.id])
    res.json({ id: req.params.id, deleted: true })
  }))

  // ── employees ──────────────────────────────────────────────────────
  app.get('/api/employees', requireAuth, h(async (req, res) => {
    // Employees can only see their own record — no directory enumeration.
    if (req.user.role === 'employee') {
      if (!req.user.employee_id) return res.json([])
      const self = await get('SELECT * FROM employees WHERE id=?', [req.user.employee_id])
      return res.json(self ? [shapeEmp(self)] : [])
    }
    let rows = await all('SELECT * FROM employees ORDER BY first_name')
    const { search, department, status } = req.query
    if (department) rows = rows.filter((e) => e.department === department)
    if (status) rows = rows.filter((e) => e.status === status)
    if (search) {
      const q = String(search).toLowerCase()
      rows = rows.filter((e) => `${e.first_name} ${e.last_name} ${e.email} ${e.job_title}`.toLowerCase().includes(q))
    }
    res.json(rows.map(shapeEmp))
  }))
  app.get('/api/employees/:id', requireAuth, h(async (req, res) => {
    // An employee may only fetch their own profile.
    if (req.user.role === 'employee' && req.params.id !== req.user.employee_id) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }
    const e = await get('SELECT * FROM employees WHERE id=?', [req.params.id])
    if (!e) return res.status(404).json({ message: 'Not found' })
    res.json(shapeEmp(e))
  }))
  app.post('/api/employees', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}
    const email = normEmail(b.email)
    if (!b.first_name || !b.last_name || !email || !b.department || !b.job_title) {
      return res.status(400).json({ message: 'first_name, last_name, email, department and job_title are required' })
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' })
    const t = now()
    // If someone already registered with this email, a stub employee record exists and is
    // linked to their login. Enrich that same record (don't create a duplicate) so the
    // person immediately sees their salary and details on their own profile.
    const existing = await get('SELECT * FROM employees WHERE email=?', [email])
    if (existing) {
      const prevSkills = existing.skills ? (() => { try { return JSON.parse(existing.skills) } catch { return [] } })() : []
      await run(
        `UPDATE employees SET first_name=?,last_name=?,phone=?,avatar_url=?,department=?,job_title=?,employment_type=?,status=?,location=?,start_date=?,salary=?,manager_id=?,bio=?,skills=?,updated_at=? WHERE id=?`,
        [b.first_name, b.last_name, b.phone ?? existing.phone ?? null, b.avatar_url ?? existing.avatar_url ?? null,
         b.department, b.job_title, b.employment_type || existing.employment_type || 'full_time',
         b.status || (existing.status === 'onboarding' ? 'active' : existing.status) || 'active',
         b.location ?? existing.location ?? '', b.start_date || existing.start_date || t.slice(0, 10),
         Number(b.salary) || existing.salary || 0, b.manager_id ?? existing.manager_id ?? null,
         b.bio ?? existing.bio ?? null, JSON.stringify(b.skills || prevSkills), t, existing.id])
      // Ensure any login with this email is linked to this employee record.
      await run('UPDATE users SET employee_id=? WHERE email=? AND (employee_id IS NULL OR employee_id<>?)', [existing.id, email, existing.id])
      return res.status(200).json(shapeEmp(await get('SELECT * FROM employees WHERE id=?', [existing.id])))
    }
    const id = uid()
    await run(`INSERT INTO employees (id,created_at,updated_at,first_name,last_name,email,phone,avatar_url,department,job_title,employment_type,status,location,start_date,salary,manager_id,bio,skills)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, t, t, b.first_name, b.last_name, email, b.phone || null, b.avatar_url || null, b.department, b.job_title,
       b.employment_type || 'full_time', b.status || 'active', b.location || '', b.start_date || t.slice(0, 10),
       Number(b.salary) || 0, b.manager_id || null, b.bio || null, JSON.stringify(b.skills || [])])
    // If a login already exists for this email (registered but not yet linked), link it now.
    await run('UPDATE users SET employee_id=? WHERE email=? AND employee_id IS NULL', [id, email])
    res.status(201).json(shapeEmp(await get('SELECT * FROM employees WHERE id=?', [id])))
  }))
  app.patch('/api/employees/:id', requireAuth, requireRole(...HR), h(async (req, res) => {
    const e = await get('SELECT * FROM employees WHERE id=?', [req.params.id])
    if (!e) return res.status(404).json({ message: 'Not found' })
    const b = req.body || {}
    if ('email' in b) { b.email = normEmail(b.email); if (!EMAIL_RE.test(b.email)) return res.status(400).json({ message: 'Please enter a valid email address' }) }
    const fields = ['first_name', 'last_name', 'email', 'phone', 'avatar_url', 'department', 'job_title', 'employment_type', 'status', 'location', 'start_date', 'salary', 'manager_id', 'bio']
    const sets = [], vals = []
    for (const f of fields) if (f in b) { sets.push(`${f}=?`); vals.push(b[f]) }
    if ('skills' in b) { sets.push('skills=?'); vals.push(JSON.stringify(b.skills || [])) }
    sets.push('updated_at=?'); vals.push(now())
    vals.push(req.params.id)
    await run(`UPDATE employees SET ${sets.join(',')} WHERE id=?`, vals)
    res.json(shapeEmp(await get('SELECT * FROM employees WHERE id=?', [req.params.id])))
  }))
  app.delete('/api/employees/:id', requireAuth, requireRole(...HR), h(async (req, res) => {
    await run('DELETE FROM employees WHERE id=?', [req.params.id])
    res.json({ id: req.params.id, deleted: true })
  }))

  // ── leave ──────────────────────────────────────────────────────────
  app.get('/api/leave', requireAuth, h(async (req, res) => {
    const em = await empMap()
    let rows = await all('SELECT * FROM leave_requests ORDER BY created_at DESC')
    if (req.user.role === 'employee') rows = rows.filter((r) => r.employee_id === req.user.employee_id)
    else {
      if (req.query.status) rows = rows.filter((r) => r.status === req.query.status)
      if (req.query.employee_id) rows = rows.filter((r) => r.employee_id === req.query.employee_id)
    }
    res.json(rows.map((r) => ({ ...r, employee: em[r.employee_id], approver: r.approved_by ? em[r.approved_by] : undefined })))
  }))
  app.post('/api/leave', requireAuth, h(async (req, res) => {
    const b = req.body || {}
    const employee_id = req.user.role === 'employee' ? req.user.employee_id : b.employee_id
    if (!employee_id) return res.status(400).json({ message: 'employee_id required' })
    if (!LEAVE_TYPES.includes(b.leave_type)) return res.status(400).json({ message: 'Invalid leave type' })
    const start = new Date(b.start_date), end = new Date(b.end_date)
    if (!b.start_date || !b.end_date || isNaN(start) || isNaN(end)) return res.status(400).json({ message: 'Valid start and end dates are required' })
    if (end < start) return res.status(400).json({ message: 'End date must be on or after the start date' })
    const days = Math.max(1, Math.floor(Number(b.days) || 0))
    const id = uid()
    await run('INSERT INTO leave_requests VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, employee_id, b.leave_type, b.start_date, b.end_date, days, b.reason || null, 'pending', null, now()])
    res.status(201).json(await get('SELECT * FROM leave_requests WHERE id=?', [id]))
  }))
  app.patch('/api/leave/:id/status', requireAuth, requireRole(...HR), h(async (req, res) => {
    if (!LEAVE_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' })
    await run('UPDATE leave_requests SET status=?, approved_by=? WHERE id=?',
      [req.body.status, req.body.approved_by || req.user.employee_id || null, req.params.id])
    res.json({ id: req.params.id, status: req.body.status })
  }))

  // ── attendance (daily present/absent) ──────────────────────────────
  app.get('/api/attendance', requireAuth, h(async (req, res) => {
    const date = req.query.date
    let rows = date ? await all('SELECT * FROM attendance WHERE date=?', [date]) : await all('SELECT * FROM attendance')
    if (req.user.role === 'employee') rows = rows.filter((r) => r.employee_id === req.user.employee_id)
    res.json(rows.map((r) => ({ id: r.id, employee_id: r.employee_id, date: r.date, status: r.status })))
  }))
  app.post('/api/attendance', requireAuth, requireRole(...HR), h(async (req, res) => {
    const { employee_id, date, status } = req.body || {}
    if (!employee_id || !date || !['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'employee_id, date and status (present|absent) are required' })
    }
    const existing = await get('SELECT id FROM attendance WHERE employee_id=? AND date=?', [employee_id, date])
    if (existing) await run('UPDATE attendance SET status=? WHERE id=?', [status, existing.id])
    else await run('INSERT INTO attendance (id,employee_id,date,status,created_at) VALUES (?,?,?,?,?)', [uid(), employee_id, date, status, now()])
    res.json({ employee_id, date, status })
  }))

  // ── recruitment (HR only) ──────────────────────────────────────────
  app.get('/api/jobs', requireAuth, requireRole(...HR), h(async (req, res) => {
    let rows = await all('SELECT * FROM job_postings ORDER BY created_at DESC')
    if (req.query.status) rows = rows.filter((j) => j.status === req.query.status)
    if (req.query.department) rows = rows.filter((j) => j.department === req.query.department)
    res.json(rows.map((j) => ({ ...j, requirements: j.requirements ? JSON.parse(j.requirements) : [] })))
  }))
  app.post('/api/jobs', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}; const id = uid(); const t = now()
    await run('INSERT INTO job_postings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, b.title, b.department, b.location || '', b.employment_type || 'full_time', b.description || '',
       JSON.stringify(b.requirements || []), Number(b.salary_min) || 0, Number(b.salary_max) || 0, b.status || 'open', 0, t, t, null])
    const j = await get('SELECT * FROM job_postings WHERE id=?', [id])
    res.status(201).json({ ...j, requirements: JSON.parse(j.requirements) })
  }))

  // Open roles visible to any authenticated user (employees can browse + apply).
  app.get('/api/jobs/open', requireAuth, h(async (req, res) => {
    const rows = await all("SELECT * FROM job_postings WHERE status='open' ORDER BY created_at DESC")
    // Tell the caller which roles they have already applied to (matched by their email).
    let appliedIds = []
    const email = req.user.email
    if (email) {
      const mine = await all('SELECT job_id FROM candidates WHERE email=?', [email])
      appliedIds = mine.map((c) => c.job_id)
    }
    res.json(rows.map((j) => ({
      id: j.id, title: j.title, department: j.department, location: j.location,
      employment_type: j.employment_type, description: j.description,
      requirements: j.requirements ? JSON.parse(j.requirements) : [],
      salary_min: j.salary_min, salary_max: j.salary_max,
      applicant_count: j.applicant_count, created_at: j.created_at,
      applied: appliedIds.includes(j.id),
    })))
  }))

  // Apply to a posted job. Creates a candidate in the "applied" stage from the user's profile.
  app.post('/api/jobs/:id/apply', requireAuth, h(async (req, res) => {
    const job = await get("SELECT * FROM job_postings WHERE id=?", [req.params.id])
    if (!job || job.status !== 'open') return res.status(404).json({ message: 'This role is no longer open' })
    const email = req.user.email
    if (!email) return res.status(400).json({ message: 'Your account has no email on file' })
    if (await get('SELECT id FROM candidates WHERE job_id=? AND email=?', [req.params.id, email])) {
      return res.status(409).json({ message: 'You have already applied to this role' })
    }
    const parts = String(req.user.name || '').split(/\s+/).filter(Boolean)
    const first = parts[0] || req.user.name || 'Applicant'
    const last = parts.slice(1).join(' ') || ''
    const t = now()
    await run('INSERT INTO candidates VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [uid(), req.params.id, first, last, email, null, 'applied', null, null, t, t])
    await run('UPDATE job_postings SET applicant_count = applicant_count + 1, updated_at=? WHERE id=?', [t, req.params.id])
    res.status(201).json({ applied: true })
  }))

  app.get('/api/candidates', requireAuth, requireRole(...HR), h(async (req, res) => {
    let rows = await all('SELECT * FROM candidates ORDER BY created_at DESC')
    if (req.query.job_id) rows = rows.filter((c) => c.job_id === req.query.job_id)
    res.json(rows)
  }))
  app.patch('/api/candidates/:id/stage', requireAuth, requireRole(...HR), h(async (req, res) => {
    await run('UPDATE candidates SET stage=?, updated_at=? WHERE id=?', [req.body.stage, now(), req.params.id])
    res.json({ id: req.params.id, stage: req.body.stage })
  }))

  // ── payroll ────────────────────────────────────────────────────────
  app.get('/api/payroll', requireAuth, h(async (req, res) => {
    const em = await empMap()
    let rows = await all('SELECT * FROM payroll_records ORDER BY created_at DESC')
    if (req.user.role === 'employee') rows = rows.filter((r) => r.employee_id === req.user.employee_id)
    res.json(rows.map((r) => ({ ...r, employee: em[r.employee_id] })))
  }))
  app.post('/api/payroll/process', requireAuth, requireRole(...HR), h(async (req, res) => {
    const { employeeIds = [], period_start, period_end } = req.body || {}
    const t = now()
    const TAX_RATE = 0.35
    for (const eid of employeeIds) {
      const e = await get('SELECT salary FROM employees WHERE id=?', [eid]); if (!e) continue
      const monthly = Math.round(e.salary / 12)
      const bonus = 0
      const gross = monthly + bonus
      const tax = Math.round(gross * TAX_RATE)   // 35% tax withheld
      const net = gross - tax
      await run('INSERT INTO payroll_records VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [uid(), eid, period_start, period_end, monthly, bonus, tax, net, 'processed', t, t])
    }
    res.json({ processed: employeeIds.length })
  }))

  // ── performance ────────────────────────────────────────────────────
  app.get('/api/performance/reviews', requireAuth, h(async (req, res) => {
    const em = await empMap()
    let rows = await all('SELECT * FROM performance_reviews ORDER BY created_at DESC')
    if (req.user.role === 'employee') rows = rows.filter((r) => r.employee_id === req.user.employee_id)
    else if (req.query.employee_id) rows = rows.filter((r) => r.employee_id === req.query.employee_id)
    res.json(rows.map((r) => ({ ...r, employee: em[r.employee_id], reviewer: em[r.reviewer_id] })))
  }))
  app.get('/api/performance/goals', requireAuth, h(async (req, res) => {
    const em = await empMap()
    let rows = await all('SELECT * FROM goals ORDER BY created_at DESC')
    if (req.user.role === 'employee') rows = rows.filter((r) => r.employee_id === req.user.employee_id)
    else if (req.query.employee_id) rows = rows.filter((r) => r.employee_id === req.query.employee_id)
    res.json(rows.map((r) => ({ ...r, employee: em[r.employee_id] })))
  }))
  app.post('/api/performance/reviews', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}
    if (!b.employee_id || !b.period) return res.status(400).json({ message: 'Employee and review period are required' })
    const clamp = (n) => Math.max(0, Math.min(10, Math.round((Number(n) || 0) * 10) / 10))
    const g = clamp(b.goals_score), s = clamp(b.skills_score), c = clamp(b.culture_score)
    const score = b.score != null ? clamp(b.score) : clamp((g + s + c) / 3)
    const id = uid(); const t = now()
    await run('INSERT INTO performance_reviews VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, b.employee_id, req.user.employee_id || null, b.period, score, g, s, c, b.comments || '', b.status || 'submitted', t])
    const em = await empMap()
    const r = await get('SELECT * FROM performance_reviews WHERE id=?', [id])
    res.status(201).json({ ...r, employee: em[r.employee_id], reviewer: em[r.reviewer_id] })
  }))
  app.post('/api/performance/goals', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}
    if (!b.employee_id || !b.title) return res.status(400).json({ message: 'Employee and goal title are required' })
    const progress = Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0)))
    const status = b.status || (progress >= 100 ? 'completed' : 'on_track')
    const id = uid(); const t = now()
    await run('INSERT INTO goals VALUES (?,?,?,?,?,?,?,?)',
      [id, b.employee_id, b.title, b.description || '', b.target_date || '', progress, status, t])
    const em = await empMap()
    const g = await get('SELECT * FROM goals WHERE id=?', [id])
    res.status(201).json({ ...g, employee: em[g.employee_id] })
  }))
  app.patch('/api/performance/goals/:id/progress', requireAuth, requireRole(...HR), h(async (req, res) => {
    const p = Math.max(0, Math.min(100, Number(req.body.progress) || 0))
    const status = p >= 100 ? 'completed' : p < 40 ? 'at_risk' : 'on_track'
    await run('UPDATE goals SET progress=?, status=? WHERE id=?', [p, status, req.params.id])
    res.json({ id: req.params.id, progress: p, status })
  }))

  // ── documents ──────────────────────────────────────────────────────
  app.get('/api/documents', requireAuth, requireRole(...HR), h(async (_req, res) => {
    // Exclude file_data from list (heavy); use /download endpoint for that
    const rows = await all('SELECT id, name, type, owner, size, updated_at, file_mime FROM documents ORDER BY updated_at DESC')
    res.json(rows)
  }))
  app.post('/api/documents', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}; const id = uid()
    const file_data = b.file_data || null
    const file_mime = b.file_mime || null
    await run('INSERT INTO documents (id,name,type,owner,size,updated_at,file_data,file_mime) VALUES (?,?,?,?,?,?,?,?)',
      [id, b.name, b.type || 'Other', b.owner || req.user.name, b.size || '—', now(), file_data, file_mime])
    res.status(201).json(await get('SELECT id,name,type,owner,size,updated_at,file_mime FROM documents WHERE id=?', [id]))
  }))
  app.get('/api/documents/:id/download', requireAuth, requireRole(...HR), h(async (req, res) => {
    const doc = await get('SELECT name, file_data, file_mime FROM documents WHERE id=?', [req.params.id])
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    if (!doc.file_data) return res.status(404).json({ message: 'No file attached to this document' })
    const buf = Buffer.from(doc.file_data, 'base64')
    res.setHeader('Content-Type', doc.file_mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`)
    res.send(buf)
  }))
  app.delete('/api/documents/:id', requireAuth, requireRole(...HR), h(async (req, res) => {
    await run('DELETE FROM documents WHERE id=?', [req.params.id])
    res.json({ id: req.params.id, deleted: true })
  }))

  // ── dashboard ──────────────────────────────────────────────────────
  app.get('/api/dashboard', requireAuth, requireRole(...HR), h(async (_req, res) => {
    const employees = await all('SELECT id, first_name, last_name, department, status, start_date, created_at FROM employees')
    const total = employees.length
    const empById = {}; for (const e of employees) empById[e.id] = e

    const deptColors = { 'Internal Audit': '#6C63FF', 'Risk and Compliance': '#00D4AA', 'Secretary': '#F5A623', 'Information Technology': '#3B82F6', 'Plan, Marketing and Promotion': '#E86FA0', 'Legal': '#8B85FF', 'Ethics Officer': '#4FA3E8', 'Operation': '#3DD68C', 'Branch Operations': '#0EA5E9', 'Finance': '#FF5F5F', 'Procurement': '#F59E0B', 'HR': '#14B8A6' }
    const byDept = {}; for (const e of employees) byDept[e.department] = (byDept[e.department] || 0) + 1
    const dept_headcount = Object.entries(byDept).map(([department, count]) => ({ department, count, color: deptColors[department] || '#94a3b8' }))

    const statusMeta = { active: ['Active', '#3dd68c'], wfh: ['Remote / WFH', '#3B82F6'], on_leave: ['On Leave', '#F5A623'], onboarding: ['Onboarding', '#8B85FF'], terminated: ['Terminated', '#EF4444'] }
    const byStatus = {}; for (const e of employees) byStatus[e.status] = (byStatus[e.status] || 0) + 1
    const status_breakdown = Object.entries(byStatus).map(([status, count]) => ({ status, label: (statusMeta[status] || [status])[0], count, color: (statusMeta[status] || [status, '#94a3b8'])[1] }))

    const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
    const presence = [
      { label: 'In Office', count: byStatus['active'] || 0, pct: pct(byStatus['active'] || 0), color: 'bg-brand-500' },
      { label: 'Remote / WFH', count: byStatus['wfh'] || 0, pct: pct(byStatus['wfh'] || 0), color: 'bg-amber-500' },
      { label: 'On Leave', count: byStatus['on_leave'] || 0, pct: pct(byStatus['on_leave'] || 0), color: 'bg-teal-500' },
    ]

    // COUNT(*) comes back as a string on Postgres, so coerce with Number().
    const open_positions = Number((await get("SELECT COUNT(*) c FROM job_postings WHERE status='open'")).c)
    const pending_leave = Number((await get("SELECT COUNT(*) c FROM leave_requests WHERE status='pending'")).c)
    const approved_leave = Number((await get("SELECT COUNT(*) c FROM leave_requests WHERE status='approved'")).c)
    const denied_leave = Number((await get("SELECT COUNT(*) c FROM leave_requests WHERE status='denied'")).c)

    const today = new Date().toISOString().slice(0, 10)
    const att = await all('SELECT status FROM attendance WHERE date=?', [today])
    const present = att.filter(a => a.status === 'present').length
    const absent = att.filter(a => a.status === 'absent').length
    const attendance_rate = total ? Math.round((present / total) * 1000) / 10 : 0

    // Headcount trend: cumulative headcount by month from real start dates (last 6 months)
    const nowDate = new Date()
    const headcount_trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const count = employees.filter(e => e.start_date && new Date(e.start_date) <= endOfMonth).length
      headcount_trend.push({ month: d.toLocaleString('en-US', { month: 'short' }), count })
    }

    // Recruitment pipeline: candidates by stage
    const stageOrder = ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']
    const byStage = {}; for (const c of await all('SELECT stage FROM candidates')) byStage[c.stage] = (byStage[c.stage] || 0) + 1
    const pipeline = stageOrder.filter(st => byStage[st]).map(stage => ({ stage: stage[0].toUpperCase() + stage.slice(1), count: byStage[stage] }))

    const reviews = {
      submitted: Number((await get("SELECT COUNT(*) c FROM performance_reviews WHERE status IN ('submitted','acknowledged')")).c),
      total,
    }

    // Activity feed: most recent real records across leave, candidates, hires
    const relTime = (iso) => {
      const diff = Date.now() - new Date(iso).getTime()
      const hh = Math.floor(diff / 3600000)
      if (hh < 1) return 'Just now'
      if (hh < 24) return `${hh}h ago`
      const dys = Math.floor(hh / 24)
      if (dys < 30) return `${dys}d ago`
      return `${Math.floor(dys / 30)}mo ago`
    }
    const acts = []
    for (const r of await all('SELECT employee_id, leave_type, created_at FROM leave_requests ORDER BY created_at DESC LIMIT 5')) {
      const e = empById[r.employee_id]
      acts.push({ created_at: r.created_at, text: `**${e ? e.first_name + ' ' + e.last_name : 'Someone'}** requested ${r.leave_type} leave`, dept: e ? e.department : '—', color: 'bg-amber-400' })
    }
    for (const c of await all('SELECT first_name, last_name, created_at FROM candidates ORDER BY created_at DESC LIMIT 5')) {
      acts.push({ created_at: c.created_at, text: `New candidate **${c.first_name} ${c.last_name}** applied`, dept: 'Recruiting', color: 'bg-teal-400' })
    }
    for (const e of await all('SELECT first_name, last_name, department, created_at FROM employees ORDER BY created_at DESC LIMIT 5')) {
      acts.push({ created_at: e.created_at, text: `**${e.first_name} ${e.last_name}** joined ${e.department}`, dept: e.department, color: 'bg-brand-400' })
    }
    const activity_feed = acts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((it, i) => ({ id: i + 1, text: it.text, time: relTime(it.created_at), dept: it.dept, color: it.color }))

    // Upcoming: real upcoming leave requests
    const upcoming_events = (await all('SELECT employee_id, leave_type, start_date, status FROM leave_requests WHERE start_date >= ? ORDER BY start_date ASC LIMIT 5', [today]))
      .map((r, i) => {
        const e = empById[r.employee_id]
        const d = new Date(r.start_date)
        return { id: i + 1, title: `${e ? e.first_name + ' ' + e.last_name : 'Someone'} — ${r.leave_type} leave`, date: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }), time: r.status, detail: `${r.leave_type} leave`, color: r.status === 'approved' ? 'border-teal-500' : 'border-amber-500' }
      })

    res.json({
      total_employees: total, open_positions, pending_leave, approved_leave, denied_leave,
      attendance_today: { present, absent, rate: attendance_rate, date: today },
      presence, dept_headcount, status_breakdown, headcount_trend, pipeline, reviews,
      activity_feed, upcoming_events,
    })
  }))

  // ── experience letters ──────────────────────────────────────────────
  // GET /api/experience-letters  — HR sees all; employee sees own
  app.get('/api/experience-letters', requireAuth, h(async (req, res) => {
    const isHR = HR.includes(req.user.role)
    if (isHR) {
      const rows = await all('SELECT * FROM experience_letters ORDER BY created_at DESC')
      const empM = await empMap()
      return res.json(rows.map(r => ({ ...r, employee: empM[r.employee_id] || null })))
    }
    if (!req.user.employee_id) return res.json([])
    const rows = await all('SELECT * FROM experience_letters WHERE employee_id=? ORDER BY created_at DESC', [req.user.employee_id])
    const empM = await empMap()
    res.json(rows.map(r => ({ ...r, employee: empM[r.employee_id] || null })))
  }))

  // POST /api/experience-letters  — any employee requests; HR can create on behalf
  app.post('/api/experience-letters', requireAuth, h(async (req, res) => {
    const b = req.body || {}
    const isHR = HR.includes(req.user.role)
    // employees can only request for themselves
    const employee_id = isHR && b.employee_id ? b.employee_id : req.user.employee_id
    if (!employee_id) return res.status(400).json({ message: 'No employee record linked to your account' })

    const emp = await get('SELECT * FROM employees WHERE id=?', [employee_id])
    if (!emp) return res.status(404).json({ message: 'Employee not found' })

    const id = uid()
    const ts = now()

    // Determine start/end dates: use provided values or fall back to employee start_date / today
    const startDate = b.start_date || emp.start_date || ts.slice(0, 10)
    const endDate = b.end_date || (emp.status === 'terminated' ? emp.updated_at.slice(0, 10) : ts.slice(0, 10))

    await run(
      `INSERT INTO experience_letters (id,employee_id,requested_by,requested_at,status,purpose,start_date,end_date,approved_by,approved_at,rejection_reason,letter_content,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, employee_id, req.user.id, ts, 'pending', b.purpose || null, startDate, endDate, null, null, null, null, ts, ts]
    )
    const row = await get('SELECT * FROM experience_letters WHERE id=?', [id])
    res.status(201).json({ ...row, employee: shapeEmp(emp) })
  }))

  // PATCH /api/experience-letters/:id/status  — HR approves/rejects
  app.patch('/api/experience-letters/:id/status', requireAuth, requireRole(...HR), h(async (req, res) => {
    const b = req.body || {}
    const { status, rejection_reason } = b
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'status must be approved or rejected' })

    const letter = await get('SELECT * FROM experience_letters WHERE id=?', [req.params.id])
    if (!letter) return res.status(404).json({ message: 'Letter request not found' })

    const ts = now()

    if (status === 'rejected') {
      await run(
        `UPDATE experience_letters SET status=?,rejection_reason=?,updated_at=? WHERE id=?`,
        ['rejected', rejection_reason || null, ts, req.params.id]
      )
    } else {
      // Generate letter content on approval
      const emp = await get('SELECT * FROM employees WHERE id=?', [letter.employee_id])
      if (!emp) return res.status(404).json({ message: 'Employee not found' })

      const formatDate = (d) => {
        if (!d) return 'N/A'
        const dt = new Date(d)
        return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      }

      // Calculate years of experience
      const start = new Date(letter.start_date)
      const end = new Date(letter.end_date)
      const diffMs = end - start
      const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
      const years = Math.floor(totalMonths / 12)
      const months = totalMonths % 12
      let duration = ''
      if (years > 0 && months > 0) duration = `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`
      else if (years > 0) duration = `${years} year${years > 1 ? 's' : ''}`
      else if (months > 0) duration = `${months} month${months > 1 ? 's' : ''}`
      else duration = 'less than a month'

      const letterContent = `EXPERIENCE LETTER

Date: ${formatDate(ts)}
Ref: EXP-${req.params.id.slice(0, 8).toUpperCase()}

To Whom It May Concern,

This is to certify that ${emp.first_name} ${emp.last_name} has been employed with ACGF in the capacity of ${emp.job_title} in the ${emp.department} department.

Period of Employment:
  Start Date : ${formatDate(letter.start_date)}
  End Date   : ${formatDate(letter.end_date)}
  Duration   : ${duration}

${emp.first_name} has demonstrated professional conduct and diligence throughout their tenure.${letter.purpose ? ` This letter is issued upon request for the purpose of: ${letter.purpose}.` : ''}

We wish ${emp.first_name} the very best in all future endeavours.

Sincerely,

_______________________________
Human Resources Department
ACGF
`

      await run(
        `UPDATE experience_letters SET status=?,approved_by=?,approved_at=?,letter_content=?,updated_at=? WHERE id=?`,
        ['approved', req.user.id, ts, letterContent, ts, req.params.id]
      )
    }

    const updated = await get('SELECT * FROM experience_letters WHERE id=?', [req.params.id])
    const emp2 = await get('SELECT * FROM employees WHERE id=?', [updated.employee_id])
    res.json({ ...updated, employee: shapeEmp(emp2) })
  }))

  // DELETE /api/experience-letters/:id  — HR can delete any; employee can cancel pending own
  app.delete('/api/experience-letters/:id', requireAuth, h(async (req, res) => {
    const letter = await get('SELECT * FROM experience_letters WHERE id=?', [req.params.id])
    if (!letter) return res.status(404).json({ message: 'Not found' })
    const isHR = HR.includes(req.user.role)
    const isOwner = req.user.employee_id === letter.employee_id
    if (!isHR && !isOwner) return res.status(403).json({ message: 'Forbidden' })
    if (!isHR && letter.status !== 'pending') return res.status(400).json({ message: 'Can only cancel pending requests' })
    await run('DELETE FROM experience_letters WHERE id=?', [req.params.id])
    res.json({ id: req.params.id, deleted: true })
  }))

  // 403/401 errors return JSON already; generic fallback:
  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))

  return app
}

module.exports = { createApp }
