const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const DEV_FALLBACK = 'acgf-dev-secret-change-me'
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

// Resolve the signing secret safely:
//  - Production (or Vercel): a strong JWT_SECRET is REQUIRED. Refusing to start with a
//    missing/weak secret prevents anyone from forging tokens with a publicly known key.
//  - Development: if none is set, generate an ephemeral random secret so local runs work
//    (sessions simply won't survive a server restart).
function resolveSecret() {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv && fromEnv !== DEV_FALLBACK && fromEnv.length >= 32) return fromEnv
  if (isProd) {
    throw new Error(
      'JWT_SECRET is missing or too weak. Set a strong secret (>= 32 chars), ' +
      'e.g. `openssl rand -hex 32`, in your environment before deploying.',
    )
  }
  console.warn('[auth] JWT_SECRET not set — using a temporary dev secret. Set JWT_SECRET for stable sessions.')
  return crypto.randomBytes(48).toString('hex')
}

const JWT_SECRET = resolveSecret()
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  )
}

// Verifies the Bearer token and attaches req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' })
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    req.user = {
      id: payload.sub, name: payload.name, email: payload.email,
      role: payload.role, employee_id: payload.employee_id,
    }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' })
  }
}

// Only allows the listed roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }
    next()
  }
}

module.exports = { signToken, requireAuth, requireRole, JWT_SECRET }
