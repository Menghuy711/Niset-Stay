import { Router } from 'express';
import { q, one, pool } from '../db.js';
import { requireLandlord, notFound, badRequest } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';
import { parseDateYMD as parseDate } from '../dateutil.js';

export const studentsRouter = Router();

studentsRouter.use(requireLandlord);

function localDateKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

/** A DATE value from mysql2 arrives as a local-midnight Date; take its local fields. */
function dateKeyOf(value) {
  if (!value) return null;
  if (value instanceof Date) return localDateKey(value);
  return String(value).slice(0, 10);
}

function daysUntil(targetKey) {
  if (!targetKey) return null;
  const ms = new Date(`${targetKey}T00:00:00`).getTime() - new Date(`${localDateKey()}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

async function ownStudent(ownerId, studentId) {
  const student = await one('SELECT * FROM students WHERE id = ? AND owner_user_id = ?', [studentId, ownerId]);
  if (!student) throw notFound('Student not found');
  return student;
}

// Validate the optional calendar fields shared by create + edit.
function validateOptionalDates(body) {
  const fields = {};
  for (const key of ['visa_expiry_date', 'contract_start', 'contract_end']) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      fields[key] = null;
    } else {
      const parsed = parseDate(body[key]);
      if (!parsed) throw badRequest(`${key} must be a valid date (YYYY-MM-DD)`);
      fields[key] = parsed;
    }
  }
  if (fields.contract_start && fields.contract_end && fields.contract_end < fields.contract_start) {
    throw badRequest('Contract end must be on or after the contract start date');
  }
  return fields;
}

function studentTypeOf(body) {
  if (body.student_type === undefined || body.student_type === null || body.student_type === '') return null;
  if (body.student_type !== 'daily' && body.student_type !== 'monthly') throw badRequest('student_type must be "daily" or "monthly"');
  return body.student_type;
}

function decorate(row) {
  const today = localDateKey();
  const visaDays = daysUntil(dateKeyOf(row.visa_expiry_date));
  const contractEnd = dateKeyOf(row.contract_end);
  const contractStart = dateKeyOf(row.contract_start);
  return {
    ...row,
    visa_expiring: visaDays !== null && visaDays >= 0 && visaDays <= 60,
    visa_expired: visaDays !== null && visaDays < 0,
    contract_expired: !!contractEnd && contractEnd < today,
    contract_active: !!(contractStart && contractEnd) && contractStart <= today && today <= contractEnd,
  };
}

const STUDENT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeStudentContact(body) {
  const out = { phone: null, email: null, notes: null, nationality: null, id_document_url: null };
  if (typeof body.phone === 'string' && body.phone.trim()) out.phone = body.phone.trim().slice(0, 50);
  if (typeof body.email === 'string' && body.email.trim()) {
    out.email = body.email.trim().slice(0, 255);
    if (!STUDENT_EMAIL_RE.test(out.email)) throw badRequest('value is not a valid email address');
  }
  if (typeof body.notes === 'string' && body.notes.trim()) out.notes = body.notes.trim();
  if (typeof body.nationality === 'string' && body.nationality.trim()) out.nationality = body.nationality.trim().slice(0, 100);
  if (typeof body.id_document_url === 'string' && body.id_document_url.trim()) {
    out.id_document_url = body.id_document_url.trim().slice(0, 255);
  }
  return out;
}

async function assignRoom(ownerId, studentId, roomId) {
  if (!roomId) return;
  // Locking transaction: a concurrent assign to the same free room must not
  // both pass the availability check. For UPDATE serializes on the room row,
  // and freeing the student's previous room happens inside the same txn so a
  // rejection rolls back cleanly instead of orphaning the student.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Serialize per-student first (a student holds only one room), then lock
    // the target room. Same lock order as the landlord assign route, so two
    // concurrent assignments can't park one student in two rooms at once.
    const [studentRows] = await conn.query(
      'SELECT id FROM students WHERE id = ? AND owner_user_id = ? FOR UPDATE',
      [studentId, ownerId]
    );
    if (!studentRows[0]) throw badRequest('Invalid student');

    const [lockedRows] = await conn.query(
      'SELECT id, status, student_id FROM rooms WHERE id = ? AND owner_user_id = ? FOR UPDATE',
      [roomId, ownerId]
    );
    const room = lockedRows[0];
    if (!room) throw badRequest('Invalid room');
    if (room.status === 'occupied' && Number(room.student_id) !== Number(studentId)) {
      throw badRequest('This room is already occupied. Remove the assigned student first.');
    }

    await conn.query(
      "UPDATE rooms SET student_id = NULL, status = 'available' WHERE student_id = ? AND owner_user_id = ?",
      [studentId, ownerId]
    );
    await conn.query(
      'UPDATE rooms SET student_id = ?, status = ? WHERE id = ? AND owner_user_id = ?',
      [studentId, 'occupied', roomId, ownerId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

studentsRouter.get('/students', async (req, res) => {
  const { type, room, q: query } = req.query;

  const clauses = ['s.owner_user_id = ?'];
  const params = [req.user.id];

  if (type === 'daily' || type === 'monthly') {
    clauses.push('s.student_type = ?');
    params.push(type);
  }
  if (room === 'assigned') clauses.push('r.id IS NOT NULL');
  if (room === 'unassigned') clauses.push('r.id IS NULL');

  const search = typeof query === 'string' && query.trim() ? query.trim().toLowerCase() : '';
  if (search) {
    clauses.push('LOWER(s.full_name) LIKE ?');
    params.push(`%${search}%`);
  }

  const [rows] = await q(
    `SELECT s.*, r.id AS room_id, r.title AS room_title
       FROM students s
       LEFT JOIN rooms r ON r.student_id = s.id
      WHERE ${clauses.join(' AND ')}
      ORDER BY s.created_at DESC`,
    params
  );
  res.json(rows.map(decorate));
});

studentsRouter.post('/students', async (req, res) => {
  const body = req.body ?? {};
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  if (!fullName) throw badRequest('full_name is required');

  const contact = safeStudentContact(body);
  let email = contact.email;
  const dates = validateOptionalDates(body);
  const studentType = studentTypeOf(body) ?? 'monthly';

  const [result] = await q(
    `INSERT INTO students
       (owner_user_id, full_name, phone, email, notes, student_type, nationality, id_document_url, visa_expiry_date, contract_start, contract_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      fullName,
      contact.phone,
      email,
      contact.notes,
      studentType,
      contact.nationality,
      contact.id_document_url,
      dates.visa_expiry_date,
      dates.contract_start,
      dates.contract_end,
    ]
  );
  // Leave the email empty and one is generated for you.
  if (!email) {
    email = `student-${result.insertId}@student.nisetstay`;
    await q('UPDATE students SET email = ? WHERE id = ?', [email, result.insertId]);
  }

  if (body.room_id) await assignRoom(req.user.id, result.insertId, body.room_id);

  const student = await one('SELECT * FROM students WHERE id = ?', [result.insertId]);
  await logAudit(req.user.id, req.user.role, 'student.created', 'students', student.id);
  res.status(201).json(decorate(student));
});

studentsRouter.patch('/students/:id', async (req, res) => {
  await ownStudent(req.user.id, req.params.id);

  const body = req.body ?? {};
  const updates = [];
  const params = [];

  if (body.full_name !== undefined) {
    const name = String(body.full_name).trim();
    if (!name) throw badRequest('full_name must be a non-empty string');
    updates.push('full_name = ?');
    params.push(name);
  }
  const STUDENT_TEXT_LIMITS = { phone: 50, nationality: 100, id_document_url: 255 };
  for (const col of ['phone', 'email', 'notes', 'nationality', 'id_document_url']) {
    if (body[col] === undefined) continue;
    if (body[col] === null) {
      updates.push(`${col} = ?`);
      params.push(null);
      continue;
    }
    let value = String(body[col]).trim();
    if (col === 'email') {
      value = value.slice(0, 255);
      if (value && !STUDENT_EMAIL_RE.test(value)) throw badRequest('value is not a valid email address');
    } else if (STUDENT_TEXT_LIMITS[col]) {
      value = value.slice(0, STUDENT_TEXT_LIMITS[col]);
    }
    updates.push(`${col} = ?`);
    params.push(value);
  }
  const studentType = studentTypeOf(body);
  if (studentType !== null) {
    updates.push('student_type = ?');
    params.push(studentType);
  }
  const dates = validateOptionalDates(body);
  if (body.visa_expiry_date !== undefined) {
    updates.push('visa_expiry_date = ?');
    params.push(dates.visa_expiry_date);
  }
  if (body.contract_start !== undefined) {
    updates.push('contract_start = ?');
    params.push(dates.contract_start);
  }
  if (body.contract_end !== undefined) {
    updates.push('contract_end = ?');
    params.push(dates.contract_end);
  }

  if (updates.length > 0) {
    params.push(req.params.id, req.user.id);
    await q(`UPDATE students SET ${updates.join(', ')} WHERE id = ? AND owner_user_id = ?`, params);
  }

  if (body.room_id) await assignRoom(req.user.id, req.params.id, body.room_id);

  await logAudit(req.user.id, req.user.role, 'student.updated', 'students', req.params.id);
  res.json(decorate(await one('SELECT * FROM students WHERE id = ?', [req.params.id])));
});

studentsRouter.delete('/students/:id', async (req, res) => {
  await ownStudent(req.user.id, req.params.id);

  // Release the student's room (occupancy derives from room status, so the
  // freed room becomes available again).
  await q(
    "UPDATE rooms SET student_id = NULL, status = 'available' WHERE student_id = ? AND owner_user_id = ?",
    [req.params.id, req.user.id]
  );

  const [result] = await q('DELETE FROM students WHERE id = ? AND owner_user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw notFound('Student not found');
  await logAudit(req.user.id, req.user.role, 'student.deleted', 'students', req.params.id);
  res.status(204).end();
});