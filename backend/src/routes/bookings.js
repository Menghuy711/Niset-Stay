import { Router } from 'express';
import { q, pool } from '../db.js';
import { requireAuth, notFound, badRequest, forbidden } from '../middleware/auth.js';
import { mysqlDatetime } from '../dateutil.js';

export const bookingsRouter = Router();

bookingsRouter.post('/', requireAuth, async (req, res) => {
  if (['landlord', 'admin', 'super_admin'].includes(req.user.role)) {
    throw forbidden('Only students can create bookings.');
  }

  const body = req.body ?? {};
  if (typeof body.full_name !== 'string' || !body.full_name.trim()) throw badRequest('full_name is required');
  const occupants = Number(body.occupants ?? 1);
  if (!Number.isFinite(occupants) || occupants < 1) throw badRequest('occupants must be a positive number');

  // Same visibility rule as the public listings: rooms owned by an
  // as-yet-unapproved (or rejected) landlord must not be bookable.
  const room = await q(
    `SELECT * FROM rooms r
      WHERE r.id = ?
        AND (r.owner_user_id IS NULL
             OR EXISTS (SELECT 1 FROM users u WHERE u.id = r.owner_user_id AND u.landlord_status = 'approved'))`,
    [body.room_id]
  ).then(([rows]) => rows[0]);
  if (!room) throw notFound('Room not found');

  const moveIn = mysqlDatetime(body.move_in, badRequest, 'move_in');

  // The active-booking check and the INSERT run in a transaction with a locking
  // read so two concurrent POSTs cannot both pass the check and create
  // duplicate active bookings for the same student+room (race condition).
  const conn = await pool.getConnection();
  let bid;
  try {
    await conn.beginTransaction();
    const [[{ existing }]] = await conn.query(
      `SELECT COUNT(*) AS existing FROM bookings
       WHERE user_id = ? AND room_id = ? AND status IN ('pending', 'confirmed')
       FOR UPDATE`,
      [req.user.id, body.room_id]
    );
    if (existing > 0) {
      throw badRequest('You already have an active booking for this room. Cancel it before booking again.');
    }

    const [result] = await conn.query(
      `INSERT INTO bookings
         (user_id, room_id, room_title, room_image, room_price,
          full_name, phone, occupants, move_in, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        body.room_id,
        room.title,
        room.image_url,
        // Price snapshot, intentionally denormalized so the booking stays readable
        // if the live room price or listing is later changed/deleted. Stored as a
        // plain numeric string (no "$"/"per month" cosmetics) so consumers can
        // parse it back to a number without stripping currency symbols.
        room.price !== null && room.price !== undefined ? String(Number(room.price)) : null,
        body.full_name,
        body.phone ?? null,
        occupants,
        moveIn,
      ]
    );
    await conn.commit();
    bid = result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  const [rows] = await q('SELECT * FROM bookings WHERE id = ?', [bid]);
  res.status(201).json(rows[0]);
});

bookingsRouter.get('/my', requireAuth, async (req, res) => {
  const [rows] = await q(
    `SELECT b.*, r.contract_terms, r.deposit_terms, r.utilities_terms
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});