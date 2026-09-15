import { Router } from 'express';
import { q, one } from '../db.js';
import { requireAdmin, requireSuperAdmin, notFound, badRequest } from '../middleware/auth.js';
import { validateTransition } from '../bookingLib.js';
import { logAudit } from '../auditLib.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/stats', async (_req, res) => {
  const [[totalRooms]] = await q('SELECT COUNT(*) AS n FROM rooms');
  const [[totalBookings]] = await q('SELECT COUNT(*) AS n FROM bookings');
  const [[pending]] = await q("SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending'");
  const [[confirmed]] = await q("SELECT COUNT(*) AS n FROM bookings WHERE status = 'confirmed'");
  res.json({
    totalRooms: totalRooms.n,
    totalBookings: totalBookings.n,
    pendingBookings: pending.n,
    confirmedBookings: confirmed.n,
  });
});

adminRouter.get('/users', async (req, res) => {
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  // Admins manage students & landlords; super_admins see every account.
  const isSuper = req.user.role === 'super_admin';
  const scope = isSuper ? '' : "WHERE role IN ('student', 'landlord')";
  const [rows] = await q(
    `SELECT id, email, full_name, role, landlord_status, is_active, created_at FROM users ${scope} ORDER BY id LIMIT ? OFFSET ?`,
    [limit, skip]
  );
  res.json(rows);
});

adminRouter.get('/rooms', async (req, res) => {
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const [rows] = await q('SELECT * FROM rooms ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
  res.json(rows);
});

adminRouter.get('/bookings', async (req, res) => {
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const [rows] = await q('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
  res.json(rows);
});

adminRouter.get('/audit-logs', requireSuperAdmin, async (req, res) => {
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const [rows] = await q(
    'SELECT id, actor_id, actor_role, action, target_table, target_id, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?',
    [limit, skip]
  );
  res.json(rows);
});

adminRouter.patch('/bookings/:id', async (req, res) => {
  const status = req.body?.status;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    throw badRequest("status must be one of: 'pending', 'confirmed', 'cancelled'");
  }
  const booking = await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) throw notFound('Booking not found');

  try {
    validateTransition(booking.status, status);
  } catch (err) {
    throw badRequest(err.message);
  }

  await q('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
  await logAudit(req.user.id, req.user.role, 'booking.status_changed', 'bookings', booking.id, { from: booking.status, to: status });
  const updated = await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  res.json(updated);
});

adminRouter.post('/bookings/:id/checkin', async (req, res) => {
  const booking = await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) throw notFound('Booking not found');
  if (booking.status !== 'confirmed') throw badRequest('Only confirmed bookings can be checked in');
  await q('UPDATE bookings SET check_in = ? WHERE id = ?', [new Date(), req.params.id]);
  await logAudit(req.user.id, req.user.role, 'booking.check_in', 'bookings', booking.id);
  res.json(await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]));
});

adminRouter.post('/bookings/:id/checkout', async (req, res) => {
  const booking = await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) throw notFound('Booking not found');
  if (!booking.check_in) throw badRequest('Cannot check out before check-in');

  let total = booking.total_price;
  if (total === null) {
    // Charge the price snapshot captured at booking time, so a later listing
    // price/delete doesn't silently change what the student is charged.
    if (booking.room_price != null && String(booking.room_price) !== '') {
      total = Number(booking.room_price);
    } else if (booking.room_id) {
      const room = await one('SELECT price FROM rooms WHERE id = ?', [booking.room_id]);
      if (room) total = Number(room.price);
    }
  }
  await q('UPDATE bookings SET check_out = ?, total_price = ? WHERE id = ?', [new Date(), total, req.params.id]);
  await logAudit(req.user.id, req.user.role, 'booking.check_out', 'bookings', booking.id, { total_price: total });
  res.json(await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]));
});