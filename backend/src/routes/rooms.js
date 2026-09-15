import { Router } from 'express';
import { q, one } from '../db.js';
import { requireAdmin, notFound, badRequest } from '../middleware/auth.js';
import {
  roomRecord, roomUpdate, normalizeRoomNumbers, PUBLIC_ROOM_COLUMNS, PUBLIC_ROOM_DETAIL_COLUMNS,
} from '../roomLib.js';

export const roomsRouter = Router();
export const universitiesRouter = Router();

// Rooms owned by an as-yet-unapproved landlord must not be visible to
// students. Rooms with no owner (e.g. admin-created) stay public.
const VISIBLE_ROOMS_WHERE = `r.owner_user_id IS NULL
  OR EXISTS (SELECT 1 FROM users u WHERE u.id = r.owner_user_id AND u.landlord_status = 'approved')`;

// Earth radius in km; used for the Haversine great-circle distance.
// The three ? slots are supplied once per use, in the order
// [university_lat, university_lng, university_lat].
const DISTANCE_EXPR = `6371.0088 * ACOS(
  LEAST(1,
    COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * COS(RADIANS(r.longitude) - RADIANS(?))
    + SIN(RADIANS(?)) * SIN(RADIANS(r.latitude))
  )
)`;

// Requires distance_params = [ulat, ulng, ulat] to satisfy DISTANCE_EXPR.
const NEAR_ROOMS_WHERE = `r.latitude IS NOT NULL AND r.longitude IS NOT NULL
  AND (${VISIBLE_ROOMS_WHERE})`;

universitiesRouter.get('/', async (req, res) => {
  const [rows] = await q(
    'SELECT id, name, short_name, latitude, longitude FROM universities ORDER BY name ASC'
  );
  res.json(rows);
});

roomsRouter.get('/', async (req, res) => {
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));

  // Proximity search: ?near=<university_id>&max_km=<number>
  const near = req.query.near ? parseInt(req.query.near, 10) : null;

  if (near) {
    const uni = await one(
      'SELECT id, name, short_name, latitude, longitude FROM universities WHERE id = ?',
      [near]
    );
    if (!uni) throw notFound('University not found');
    if (uni.latitude == null || uni.longitude == null) {
      throw badRequest('University has no coordinates');
    }

    const maxKm = Number(req.query.max_km);
    const hasMaxKm = req.query.max_km !== undefined && Number.isFinite(maxKm);

    const distanceParams = [Number(uni.latitude), Number(uni.longitude), Number(uni.latitude)];
    let sql =
      `SELECT ${PUBLIC_ROOM_COLUMNS.join(', ')}, ${DISTANCE_EXPR} AS distance_km FROM rooms r WHERE ${NEAR_ROOMS_WHERE}`;
    if (hasMaxKm) {
      if (maxKm <= 0) throw badRequest('max_km must be greater than 0');
      sql += ' HAVING distance_km <= ?';
      distanceParams.push(maxKm);
    }
    sql += ' ORDER BY distance_km ASC LIMIT ? OFFSET ?';
    distanceParams.push(limit, skip);

    const [rows] = await q(sql, distanceParams);
    return res.json(rows);
  }

  const [rows] = await q(
    `SELECT ${PUBLIC_ROOM_COLUMNS.join(', ')} FROM rooms r
      WHERE ${VISIBLE_ROOMS_WHERE}
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [limit, skip]
  );
  res.json(rows);
});

roomsRouter.get('/:id', async (req, res) => {
  const room = await one(
    `SELECT ${PUBLIC_ROOM_DETAIL_COLUMNS.join(', ')} FROM rooms r
      WHERE r.id = ? AND (${VISIBLE_ROOMS_WHERE})`,
    [req.params.id]
  );
  if (!room) throw notFound('Room not found');
  res.json(room);
});

roomsRouter.post('/', requireAdmin, async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.title !== 'string' || !body.title.trim()) throw badRequest('title is required');
  if (body.price === undefined || body.price === null || body.price === '') throw badRequest('price is required');
  normalizeRoomNumbers(body);

  // Mirror the PUT path: owner_user_id, when supplied, must reference an
  // existing landlord account (otherwise the room is invisible to the public
  // and lands in the wrong account's portal).
  if (body.owner_user_id !== undefined && body.owner_user_id !== null && body.owner_user_id !== '') {
    const owner = await one(
      "SELECT id FROM users WHERE id = ? AND role = 'landlord'",
      [body.owner_user_id]
    );
    if (!owner) throw badRequest('owner_user_id must reference an existing landlord account');
  }

  const { columns, params } = roomRecord(body);
  const placeholders = columns.map(() => '?').join(', ');

  const [result] = await q(`INSERT INTO rooms (${columns.join(', ')}) VALUES (${placeholders})`, params);
  const room = await one('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
  res.status(201).json(room);
});

roomsRouter.put('/:id', requireAdmin, async (req, res) => {
  const room = await one('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
  if (!room) throw notFound('Room not found');

  const body = req.body ?? {};
  normalizeRoomNumbers(body);

  // Admins may reassign a room to a different landlord (or detach it).
  const extraFields = {};
  if (body.owner_user_id !== undefined) {
    if (body.owner_user_id === null || body.owner_user_id === '') {
      extraFields.owner_user_id = null;
    } else {
      const owner = await one(
        "SELECT id FROM users WHERE id = ? AND role = 'landlord'",
        [body.owner_user_id]
      );
      if (!owner) throw badRequest('owner_user_id must reference an existing landlord account');
      extraFields.owner_user_id = body.owner_user_id;
    }
  }

  const { sets, params } = roomUpdate(body, extraFields);
  if (sets.length) {
    params.push(req.params.id);
    await q(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  const updated = await one('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
  res.json(updated);
});

roomsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const room = await one('SELECT id, student_id FROM rooms WHERE id = ?', [req.params.id]);
  if (!room) throw notFound('Room not found');

  // Mirror the landlord delete guard: a room with an assigned resident must be
  // freed first, otherwise the FK silently SET NULLs and the student record
  // keeps pointing at a vanished room.
  if (room.student_id != null) {
    throw badRequest('Cannot delete a room that has an assigned student. Remove the student from the room first.');
  }

  const [[active]] = await q(
    "SELECT COUNT(*) AS n FROM bookings WHERE room_id = ? AND status IN ('pending', 'confirmed')",
    [req.params.id]
  );
  if (active.n > 0) {
    throw badRequest('Cannot delete a room that still has pending or confirmed bookings. Cancel them first.');
  }

  const [result] = await q('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw notFound('Room not found');
  res.status(204).end();
});