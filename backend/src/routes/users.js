import { Router } from 'express';
import { q, one } from '../db.js';
import { requireAuth, requireAdmin, badRequest, forbidden, notFound } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';

const USERS_ROLES = new Set(['student', 'landlord', 'admin', 'super_admin']);

// Admins manage the normal roles (students & landlords). Super admins manage
// every role, including other staff. Staff roles are assigned only by
// super admin.
const ADMIN_SCOPED_ROLES = new Set(['student', 'landlord']);

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, (req, res) => {
  const { id, email, full_name, phone, role, is_active, image_url, created_at } = req.user;
  res.json({ id, email, full_name, phone, role, is_active, image_url, created_at });
});

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const { full_name: fullName, phone, image_url: imageUrl } = req.body ?? {};

  const updates = [];
  const params = [];

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || !fullName.trim()) {
      throw badRequest('full_name must be a non-empty string');
    }
    updates.push('full_name = ?');
    params.push(fullName.trim());
  }

  if (phone !== undefined) {
    if (phone !== null && (typeof phone !== 'string' || phone.trim().length > 50)) {
      throw badRequest('phone must be a string of at most 50 characters');
    }
    updates.push('phone = ?');
    params.push(phone === null ? null : phone.trim());
  }

  if (imageUrl !== undefined) {
    if (imageUrl !== null && (typeof imageUrl !== 'string' || imageUrl.length > 500)) {
      throw badRequest('image_url must be a string of at most 500 characters');
    }
    updates.push('image_url = ?');
    params.push(imageUrl === null ? null : imageUrl);
  }

  if (updates.length === 0) {
    throw badRequest('Nothing to update');
  }

  params.push(req.user.id);
  await q(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  const user = await one('SELECT id, email, full_name, phone, role, is_active, image_url, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
});

// ── Staff: user administration ─────────────────────────────────────────
// Admin manages students & landlords; super_admin manages every role.

usersRouter.get('/', requireAdmin, async (req, res) => {
  const isSuper = req.user.role === 'super_admin';
  const scope = isSuper ? '' : "WHERE role IN ('student', 'landlord')";
  const [rows] = await q(
    `SELECT id, email, full_name, phone, role, landlord_status, is_active, created_at FROM users ${scope} ORDER BY id`
  );
  res.json(rows);
});

usersRouter.patch('/:id', requireAdmin, async (req, res) => {
  const target = await one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) throw notFound('User not found');

  const isSuper = req.user.role === 'super_admin';

  // Role scoping: a plain admin can only touch students and landlords, and
  // can never assign staff roles.
  if (!isSuper && !ADMIN_SCOPED_ROLES.has(target.role)) {
    throw forbidden('Admins can only manage students and landlords.');
  }

  const { role, is_active: isActive } = req.body ?? {};
  const updates = [];
  const params = [];

  if (role !== undefined) {
    if (!USERS_ROLES.has(role)) {
      throw badRequest("role must be one of: 'student', 'landlord', 'admin', 'super_admin'");
    }
    if (!isSuper && !ADMIN_SCOPED_ROLES.has(role)) {
      throw forbidden('Only super admins can assign staff roles.');
    }
    if (target.id === req.user.id && role !== 'super_admin') {
      throw badRequest('You cannot demote your own account');
    }
    if (target.role === 'super_admin' && role !== 'super_admin') {
      const [[{ count }]] = await q(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1"
      );
      if (count <= 1) {
        throw badRequest('Cannot demote the last active super_admin. Promote another user first.');
      }
    }
    updates.push('role = ?');
    params.push(role);

    // Promoting a user to landlord activates the portal immediately — there is
    // no admin review step. Demoting away from landlord clears the field.
    if (role === 'landlord' && target.role !== 'landlord') {
      updates.push("landlord_status = 'approved'");
    } else if (role !== 'landlord' && target.role === 'landlord') {
      updates.push('landlord_status = NULL');
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw badRequest('is_active must be a boolean');
    if (target.id === req.user.id && !isActive) {
      throw badRequest('You cannot deactivate your own account');
    }
    if (target.role === 'super_admin' && isActive === false) {
      const [[{ count }]] = await q(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1"
      );
      if (count <= 1) {
        throw badRequest('Cannot deactivate the last active super_admin. Promote another user first.');
      }
    }
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    throw badRequest('Nothing to update');
  }

  params.push(target.id);
  await q(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  const detail = {};
  if (role !== undefined) detail.role = { from: target.role, to: role };
  if (isActive !== undefined) detail.is_active = { from: Boolean(target.is_active), to: isActive };
  await logAudit(req.user.id, req.user.role, 'user.updated', 'users', target.id, detail);

  const updated = await one(
    'SELECT id, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
    [target.id]
  );
  res.json(updated);
});