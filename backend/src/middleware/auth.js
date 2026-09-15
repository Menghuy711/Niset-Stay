import { verifyToken } from '../security.js';
import { one } from '../db.js';
import { settings } from '../config.js';

export class HttpError extends Error {
  constructor(status, detail, headers) {
    super(detail);
    this.status = status;
    this.headers = headers;
  }
}

export const badRequest = (detail) => new HttpError(400, detail);
export const unauthorized = (detail) => new HttpError(401, detail, { 'WWW-Authenticate': 'Bearer' });
export const forbidden = (detail) => new HttpError(403, detail);
export const notFound = (detail) => new HttpError(404, detail);

// Accept the token from either the Authorization header (APIs, tests) or the
// httpOnly `niset_token` cookie (browser session). Order deliberately prefers
// an explicitly-supplied header over the ambient cookie.
function bearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  return req.cookies?.[settings.jwt.cookieName] ?? null;
}

async function resolveUser(req) {
  const token = bearerToken(req);
  const payload = token && verifyToken(token);
  if (!payload || payload.purpose) {
    throw unauthorized('Could not validate credentials');
  }
  const email = payload.sub;
  if (!email) throw unauthorized('Could not validate credentials');

  const user = await one('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw unauthorized('User not found');
  if (!user.is_active) throw forbidden('Account is deactivated');

  req.user = user;
}

export const requireAuth = async (req, _res, next) => {
  try {
    await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

// Valid roles are defined in two places that must stay in sync if a new role
// is ever added: the `users.role` DB ENUM ('student' | 'landlord' | 'admin' |
// 'super_admin') and the USERS_ROLES set in backend/src/routes/users.js.

export const requireRole =
  (...roles) =>
  async (req, _res, next) => {
    try {
      await resolveUser(req);
      if (!roles.includes(req.user.role)) {
        throw forbidden('You do not have permission to access this resource');
      }
      next();
    } catch (err) {
      next(err);
    }
  };

export const requireAdmin = requireRole('admin', 'super_admin');

export const requireSuperAdmin = requireRole('super_admin');

// Landlord-facing gate: staff (admin/super_admin) always pass; a landlord
// account may use the portal (rooms, students, bills, floors, uploads,
// management fees, dashboard) as soon as it exists. There is no admin
// approval step — registering as a landlord activates the portal immediately.
export const requireLandlord = requireRole('landlord', 'admin', 'super_admin');