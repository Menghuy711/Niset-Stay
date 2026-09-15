import { Router } from 'express';
import { q, one, pool } from '../db.js';
import { requireAuth, requireLandlord, notFound, badRequest, forbidden } from '../middleware/auth.js';
import { roomRecord, roomUpdate, ROOM_OWNER_INDEX, normalizeRoomNumbers } from '../roomLib.js';
import { validateTransition } from '../bookingLib.js';
import { logAudit } from '../auditLib.js';

export const landlordRouter = Router();

// ── Home information (Settings → Profile) ────────────────────────────────
// Home name/address are tenant-facing settings edited from the profile page,
// so they deliberately bypass the landlord gate below. Upserting into
// billing_config feeds the invoice header later without disturbing the stored
// billing rates.
landlordRouter.get('/home', requireAuth, async (req, res) => {
  if (req.user.role !== 'landlord') throw forbidden('Only landlords manage a home');
  const config = await one(
    'SELECT home_name, home_address FROM billing_config WHERE landlord_id = ?',
    [req.user.id]
  );
  res.json({
    home_name: config?.home_name ?? '',
    home_address: config?.home_address ?? '',
  });
});

landlordRouter.put('/home', requireAuth, async (req, res) => {
  if (req.user.role !== 'landlord') throw forbidden('Only landlords manage a home');
  const { home_name: homeName, home_address: homeAddress } = req.body ?? {};

  const name = homeName === undefined || homeName === null || homeName === ''
    ? null
    : typeof homeName === 'string' && homeName.trim().length <= 255
      ? homeName.trim()
      : null;
  if (name === null && !(homeName === undefined || homeName === null || homeName === '')) {
    throw badRequest('home_name must be a string of at most 255 characters');
  }

  const address = homeAddress === undefined || homeAddress === null || homeAddress === ''
    ? null
    : typeof homeAddress === 'string' && homeAddress.trim().length <= 500
      ? homeAddress.trim()
      : null;
  if (address === null && !(homeAddress === undefined || homeAddress === null || homeAddress === '')) {
    throw badRequest('home_address must be a string of at most 500 characters');
  }

  await q(
    `INSERT INTO billing_config (landlord_id, home_name, home_address)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE home_name = VALUES(home_name), home_address = VALUES(home_address)`,
    [req.user.id, name, address]
  );
  await logAudit(req.user.id, req.user.role, 'home.updated', 'billing_config', req.user.id);
  res.json({ home_name: name, home_address: address });
});

// Landlord portal is open to landlords and (as an audit aid) staff.
landlordRouter.use(requireLandlord);

// Stats for the logged-in landlord's own rooms. Staff (admin/super_admin) may
// pass ?owner_id=<userId> to inspect a specific landlord's stats as an audit
// aid; a plain landlord is always scoped to their own account.
landlordRouter.get('/stats', async (req, res) => {
  let ownerId;
  const raw = req.query.owner_id;
  if (req.user.role === 'landlord') {
    ownerId = req.user.id;
  } else if (raw === undefined || raw === null || raw === '') {
    ownerId = req.user.id;
  } else {
    ownerId = Number(raw);
    if (!Number.isFinite(ownerId)) throw badRequest('owner_id must be a number');
  }
  const [[roomCount]] = await q('SELECT COUNT(*) AS n FROM rooms WHERE owner_user_id = ?', [ownerId]);
  const [[bookingCount]] = await q(
    `SELECT COUNT(*) AS n FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE r.owner_user_id = ?`,
    [ownerId]
  );
  const [[pending]] = await q(
    `SELECT COUNT(*) AS n FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE r.owner_user_id = ? AND b.status = 'pending'`,
    [ownerId]
  );
  const [[confirmed]] = await q(
    `SELECT COUNT(*) AS n FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE r.owner_user_id = ? AND b.status = 'confirmed'`,
    [ownerId]
  );
  const [[earnings]] = await q(
    `SELECT COALESCE(SUM(b.total_price), 0) AS n FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE r.owner_user_id = ? AND b.status = 'confirmed' AND b.check_out IS NOT NULL`,
    [ownerId]
  );
  res.json({
    myRooms: roomCount.n,
    totalBookings: bookingCount.n,
    pendingBookings: pending.n,
    confirmedBookings: confirmed.n,
    earnings: Number(earnings.n),
  });
});

landlordRouter.get('/rooms', async (req, res) => {
  const [rows] = await q(
    `SELECT r.*, f.label AS floor_label, s.full_name AS student_name
       FROM rooms r
       LEFT JOIN floors f ON f.id = r.floor_id
       LEFT JOIN students s ON s.id = r.student_id
      WHERE r.owner_user_id = ?
      ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

landlordRouter.post('/rooms', async (req, res) => {
  const body = req.body ?? {};

  if (typeof body.title !== 'string' || !body.title.trim()) throw badRequest('title is required');
  if (body.price === undefined || body.price === null || body.price === '') throw badRequest('price is required');
  normalizeRoomNumbers(body);

  const record = roomRecord(body);
  const columns = record.columns;
  const params = record.params;
  // Tie the listing to the logged-in landlord account.
  params[ROOM_OWNER_INDEX] = req.user.id;

  // Optional floor assignment (must belong to this landlord).
  if (body.floor_id !== undefined && body.floor_id !== null && body.floor_id !== '') {
    const floor = await one('SELECT id FROM floors WHERE id = ? AND owner_user_id = ?', [body.floor_id, req.user.id]);
    if (!floor) throw badRequest('Invalid floor');
    columns.push('floor_id');
    params.push(Number(body.floor_id));
  }

  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await q(`INSERT INTO rooms (${columns.join(', ')}) VALUES (${placeholders})`, params);
  const room = await one('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
  await logAudit(req.user.id, req.user.role, 'room.created', 'rooms', room.id);
  res.status(201).json(room);
});

async function ownRoom(ownerId, roomId) {
  const room = await one('SELECT * FROM rooms WHERE id = ? AND owner_user_id = ?', [roomId, ownerId]);
  if (!room) throw notFound('Room not found');
  return room;
}

landlordRouter.put('/rooms/:id', async (req, res) => {
  await ownRoom(req.user.id, req.params.id);

  const body = req.body ?? {};
  normalizeRoomNumbers(body);

  // Optional floor re-assignment (must belong to this landlord).
  const extraFields = {};
  if (body.floor_id !== undefined) {
    if (body.floor_id === null || body.floor_id === '') {
      extraFields.floor_id = null;
    } else {
      const floor = await one('SELECT id FROM floors WHERE id = ? AND owner_user_id = ?', [body.floor_id, req.user.id]);
      if (!floor) throw badRequest('Invalid floor');
      extraFields.floor_id = Number(body.floor_id);
    }
  }

  const { sets, params } = roomUpdate(body, extraFields);
  if (sets.length) {
    params.push(req.params.id, req.user.id);
    await q(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ? AND owner_user_id = ?`, params);
  }
  const updated = await one('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
  await logAudit(req.user.id, req.user.role, 'room.updated', 'rooms', updated.id);
  res.json(updated);
});

landlordRouter.delete('/rooms/:id', async (req, res) => {
  const room = await ownRoom(req.user.id, req.params.id);
  if (room.student_id) {
    throw badRequest('Remove the assigned student first before deleting this room.');
  }

  const [[active]] = await q(
    "SELECT COUNT(*) AS n FROM bookings WHERE room_id = ? AND status IN ('pending', 'confirmed')",
    [req.params.id]
  );
  if (active.n > 0) {
    throw badRequest('Cannot delete a room that still has pending or confirmed bookings. Cancel them first.');
  }

  const [result] = await q('DELETE FROM rooms WHERE id = ? AND owner_user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw notFound('Room not found');
  await logAudit(req.user.id, req.user.role, 'room.deleted', 'rooms', req.params.id);
  res.status(204).end();
});

landlordRouter.patch('/rooms/:id/assign', async (req, res) => {
  const studentId = Number(req.body?.student_id);
  if (!Number.isFinite(studentId)) throw badRequest('student_id is required');

  const room = await ownRoom(req.user.id, req.params.id);
  const student = await one('SELECT id FROM students WHERE id = ? AND owner_user_id = ?', [studentId, req.user.id]);
  if (!student) throw notFound('Student not found');

  // Lock the target room inside a transaction so two concurrent assigns cannot
  // both read it as free and double-occupy (or interleave their "free previous
  // room" updates and orphan a student mid-swap).
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Serialize per-student first (a student holds only one room), then lock
    // the target room. Same lock order as students.js assignRoom, so two
    // concurrent swaps can't assign one student to two different rooms.
    const [studentRows] = await conn.query(
      'SELECT id FROM students WHERE id = ? AND owner_user_id = ? FOR UPDATE',
      [studentId, req.user.id]
    );
    if (!studentRows[0]) throw notFound('Student not found');

    const [lockedRows] = await conn.query(
      'SELECT id, student_id FROM rooms WHERE id = ? AND owner_user_id = ? FOR UPDATE',
      [req.params.id, req.user.id]
    );
    const locked = lockedRows[0];
    if (!locked) throw notFound('Room not found');

    // A room holds at most one student: refuse to overwrite an existing occupant.
    if (locked.student_id && Number(locked.student_id) !== studentId) {
      throw badRequest('This room is already occupied. Remove the assigned student first.');
    }

    // A student occupies only one room; free any previous room they held.
    await conn.query(
      "UPDATE rooms SET student_id = NULL, status = 'available' WHERE student_id = ? AND owner_user_id = ?",
      [studentId, req.user.id]
    );
    await conn.query(
      "UPDATE rooms SET student_id = ?, status = 'occupied' WHERE id = ? AND owner_user_id = ?",
      [studentId, req.params.id, req.user.id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logAudit(req.user.id, req.user.role, 'room.assigned', 'rooms', req.params.id, { student_id: studentId });
  res.json(await one('SELECT * FROM rooms WHERE id = ?', [req.params.id]));
});

landlordRouter.patch('/rooms/:id/unassign', async (req, res) => {
  await ownRoom(req.user.id, req.params.id);

  await q(
    "UPDATE rooms SET student_id = NULL, status = 'available' WHERE id = ? AND owner_user_id = ?",
    [req.params.id, req.user.id]
  );
  await logAudit(req.user.id, req.user.role, 'room.unassigned', 'rooms', req.params.id);
  res.json(await one('SELECT * FROM rooms WHERE id = ?', [req.params.id]));
});

landlordRouter.get('/bookings', async (req, res) => {
  const [rows] = await q(
    `SELECT b.*, r.title AS room_title FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE r.owner_user_id = ?
      ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

landlordRouter.patch('/bookings/:id', async (req, res) => {
  const status = req.body?.status;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    throw badRequest("status must be one of: 'pending', 'confirmed', 'cancelled'");
  }

  const booking = await one(
    `SELECT b.* FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE b.id = ? AND r.owner_user_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!booking) throw notFound('Booking not found');

  try {
    validateTransition(booking.status, status);
  } catch (err) {
    throw badRequest(err.message);
  }

  await q('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
  await logAudit(req.user.id, req.user.role, 'booking.status_changed', 'bookings', booking.id, { from: booking.status, to: status });
  res.json(await one('SELECT * FROM bookings WHERE id = ?', [req.params.id]));
});