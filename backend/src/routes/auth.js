import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { settings } from '../config.js';
import { one, q, pool } from '../db.js';
import { hashPassword, verifyPassword, createAccessToken } from '../security.js';
import { requireAuth, unauthorized, badRequest } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../mailer.js';

export const authRouter = Router();

const ipKey = (req) => req.ip || req.socket.remoteAddress || 'unknown';

const rateLimitJson = { standardHeaders: true, legacyHeaders: false, keyGenerator: ipKey, handler: (_req, res) => res.status(429).json({ detail: 'Rate limit exceeded: too many requests' }) };

// In debug (dev) mode, loosen auth throttling so local testing and e2e
// suites don't trip the limiter. Production limits stay strict even if a
// DEBUG=true slip into the deployed .env.
const isProd = process.env.NODE_ENV === 'production';
const loginLimit = settings.debug && !isProd ? 100 : 10;
const forgotLimit = settings.debug && !isProd ? 50 : 5;
const registerLimit = settings.debug && !isProd ? 100 : 5;

const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: loginLimit, ...rateLimitJson });

const forgotLimiter = rateLimit({ windowMs: 60 * 1000, limit: forgotLimit, ...rateLimitJson });

// Account-spam / DB-fill protection. Generous in dev so the e2e suite can
// register fixtures without tripping the counter.
const registerLimiter = rateLimit({ windowMs: 60 * 1000, limit: registerLimit, ...rateLimitJson });

// reset-password performs a synchronous bcrypt hash per valid token, so strict
// throttling doubles as a CPU-usage guard against brute-forcing reset tokens.
const resetLimit = settings.debug && !isProd ? 50 : 5;
const resetLimiter = rateLimit({ windowMs: 60 * 1000, limit: resetLimit, ...rateLimitJson });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requireEmail = (email) => {
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return 'value is not a valid email address';
  return null;
};

const RESET_TOKEN_TTL_SECONDS = 15 * 60;

const sha256hex = (value) => createHash('sha256').update(value).digest('hex');

const cookieOptions = {
  httpOnly: true,
  // The browser attaches the session cookie to every /api fetch. In
  // production the React app lives on a different site (GitHub Pages) than
  // the API, so SameSite=Lax would block the cross-site fetch and log out
  // every user right after they sign in. 'none' requires 'secure', which the
  // line below already forces for any non-local deployment.
  sameSite: isProd ? 'none' : 'lax',
  // Force Secure in production even if a stray DEBUG=true sneaks into .env.
  secure: isProd || !settings.debug,
  path: '/',
  maxAge: settings.jwt.accessTokenExpireMinutes * 60 * 1000,
};

authRouter.post('/register', registerLimiter, async (req, res) => {
  const { email, full_name: fullName, password, role } = req.body ?? {};
  if (typeof email !== 'string' || requireEmail(email)) throw badRequest('value is not a valid email address');
  if (typeof fullName !== 'string' || !fullName.trim()) throw badRequest('full_name is required');
  if (typeof password !== 'string' || password.length < 8) throw badRequest('password must be at least 8 characters');

  const requestedRole = role ?? 'student';
  if (!['student', 'landlord'].includes(requestedRole)) {
    throw badRequest('You can only register as a student or a landlord');
  }

  const [result] = await q(
    `INSERT INTO users (email, full_name, role, hashed_password, landlord_status)
     VALUES (?, ?, ?, ?, IF(? = 'landlord', 'approved', NULL))`,
    [email.trim(), fullName, requestedRole, hashPassword(password), requestedRole]
  );

  const user = await one(
    'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
    [result.insertId]
  );
  res.status(201).json(user);
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await one('SELECT * FROM users WHERE email = ?', [email?.trim()]);
  if (!user || !verifyPassword(password ?? '', user.hashed_password)) {
    throw unauthorized('Incorrect email or password');
  }
  if (!user.is_active) throw unauthorized('Account is deactivated');
  const token = createAccessToken({ sub: user.email });
  res.cookie(settings.jwt.cookieName, token, cookieOptions);
  res.json({ access_token: token, token_type: 'bearer' });
});

// Logs out by clearing the httpOnly session cookie. Client-side callers must
// also drop any locally stored user state.
authRouter.post('/logout', (_req, res) => {
  res.clearCookie(settings.jwt.cookieName, { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  const { id, email, full_name, phone, role, is_active, image_url, created_at } = req.user;
  res.json({ id, email, full_name, phone, role, is_active, image_url, created_at });
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw badRequest('current_password is required');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw badRequest('new_password must be at least 8 characters');
  }
  if (!verifyPassword(currentPassword, req.user.hashed_password)) {
    throw badRequest('Current password is incorrect');
  }

  await q('UPDATE users SET hashed_password = ? WHERE id = ?', [hashPassword(newPassword), req.user.id]);
  res.json({ message: 'Password updated successfully' });
});

authRouter.post('/forgot-password', forgotLimiter, async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  if (requireEmail(email)) throw badRequest('value is not a valid email address');

  // Single-use, DB-backed reset token: the raw token is only ever seen by the
  // requestor (in DEBUG mode it is echoed back for the dev flow); the API and
  // frontend only ever handle a SHA-256 hash of it, so a database leak cannot
  // be replayed to reset accounts.
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

  await q(
    'INSERT INTO password_reset_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)',
    [email, sha256hex(rawToken), expiresAt]
  );
  // Keep at most the single most-recent unused token per email so the table
  // cannot grow unboundedly from repeated forgot-password requests.
  await q(
    `DELETE FROM password_reset_tokens
       WHERE email = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM password_reset_tokens WHERE email = ? ORDER BY id DESC LIMIT 1
           ) AS keep
         )`,
    [email, email]
  );

  const response = { message: 'If that email exists, a reset link has been sent.' };
  // Dev-only convenience: echo the raw token so local testing and the e2e
  // suite can complete the reset without an inbox. Never echoed in production,
  // even if DEBUG=true slips into the deployed .env.
  if (settings.debug && !isProd) {
    response.reset_token = rawToken;
  }
  await sendPasswordResetEmail(email, rawToken);
  res.json(response);
});

authRouter.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, new_password: newPassword } = req.body ?? {};
  if (typeof token !== 'string' || !token) throw badRequest('reset token is required');
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw badRequest('new_password must be at least 8 characters');
  }

  const tokenHash = sha256hex(token);
  const now = new Date();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT email FROM password_reset_tokens
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`,
      [tokenHash, now]
    );
    if (rows.length === 0) throw badRequest('Invalid or expired reset token');

    await conn.query('UPDATE users SET hashed_password = ? WHERE email = ?', [
      hashPassword(newPassword),
      rows[0].email,
    ]);
    await conn.query('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?', [now, tokenHash]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json({ message: 'Password updated successfully' });
});