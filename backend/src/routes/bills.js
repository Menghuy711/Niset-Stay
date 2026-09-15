import { Router } from 'express';
import { q, one, pool } from '../db.js';
import { requireLandlord, notFound, badRequest } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';
import { parseDateYMD as parseDate } from '../dateutil.js';

export const billsRouter = Router();

billsRouter.use(requireLandlord);

async function ownBill(ownerId, billId) {
  const bill = await one('SELECT * FROM bills WHERE id = ? AND landlord_id = ?', [billId, ownerId]);
  if (!bill) throw notFound('Bill not found');
  return bill;
}

/** Normalize "YYYY-MM" or "YYYY-MM-DD" into the first day of that month. */
function parseMonth(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) return null;
  const [, year, month] = match;
  const mo = Number(month);
  if (mo < 1 || mo > 12) return null;
  return `${year}-${String(mo).padStart(2, '0')}-01`;
}

/** Parse a full "YYYY-MM-DD" calendar date (strict; rejects impossible dates). */

const money = (n) => Math.round(Number(n) * 100) / 100;

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

async function requireConfig(ownerId) {
  const [rows] = await q('SELECT * FROM billing_config WHERE landlord_id = ?', [ownerId]);
  if (rows.length === 0) {
    throw badRequest('Billing is not set up yet. Open Settings → Billing Config to set your rates before billing.');
  }
  return rows[0];
}

function parseConfig(body) {
  const numbers = ['default_room_fee', 'electricity_rate', 'water_rate', 'trash_fee', 'default_billing_day', 'upfront_months'];
  const config = {};
  for (const key of numbers) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      if (key === 'default_room_fee' || key === 'electricity_rate' || key === 'water_rate' || key === 'trash_fee') {
        config[key] = 0;
      } else if (key === 'default_billing_day') {
        config[key] = 1;
      } else {
        config[key] = 0;
      }
      continue;
    }
    const num = Number(body[key]);
    if (!Number.isFinite(num) || num < 0) throw badRequest(`${key} must be a positive number`);
    config[key] = key === 'default_billing_day' ? Math.floor(num) : money(num);
  }
  if (config.default_billing_day < 1 || config.default_billing_day > 28) {
    throw badRequest('default_billing_day must be between 1 and 28');
  }
  config.home_name = typeof body.home_name === 'string' && body.home_name.trim() ? body.home_name.trim().slice(0, 255) : null;
  config.first_bill_exclude_utilities = body.first_bill_exclude_utilities ? 1 : 0;

  const additionalFees = [];
  if (Array.isArray(body.additional_fees)) {
    for (const fee of body.additional_fees) {
      const name = typeof fee.name === 'string' && fee.name.trim() ? fee.name.trim().slice(0, 255) : '';
      const amount = money(Number(fee.amount));
      if (!name || !Number.isFinite(amount) || amount <= 0) throw badRequest('Every additional fee needs a name and a positive amount');
      additionalFees.push({ name, amount });
    }
  }
  config.additional_fees = JSON.stringify(additionalFees);
  return config;
}

/** Compute bill line items from a BODY payload (which may include auto items). */
async function buildItems(ownerId, body) {
  if (!Array.isArray(body.items) || body.items.length === 0) throw badRequest('At least one bill item is required');
  const config = await requireConfig(ownerId);

  const items = [];
  let total = 0;
  for (const row of body.items) {
    const kind = row.kind;
    if (!['rent', 'electricity', 'water', 'trash', 'additional', 'oneoff'].includes(kind)) {
      throw badRequest(`Unsupported item kind "${kind}"`);
    }
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, 255) : '';
    const quantity = row.quantity === undefined || row.quantity === null || row.quantity === '' ? null : Number(row.quantity);
    const rate = row.rate === undefined || row.rate === null || row.rate === '' ? null : Number(row.rate);
    const amountInput = row.amount === undefined || row.amount === null || row.amount === '' ? null : Number(row.amount);
    const prev = row.prev_reading === undefined || row.prev_reading === null || row.prev_reading === '' ? null : Number(row.prev_reading);
    const curr = row.curr_reading === undefined || row.curr_reading === null || row.curr_reading === '' ? null : Number(row.curr_reading);

    let amount = 0;
    let auto = false;
    let ratePer = null;

    if (kind === 'rent') {
      // Explicit amount wins and is treated as the total (never multiplied by
      // quantity). Otherwise a rate + quantity is the total; otherwise fall
      // back to the configured room fee times any quantity (e.g. months).
      if (amountInput !== null) {
        amount = amountInput;
        auto = false;
      } else if (quantity !== null && rate !== null) {
        amount = rate * quantity;
        auto = false;
      } else {
        amount = config.default_room_fee * (quantity ?? 1);
        auto = true;
      }
    } else if (kind === 'electricity' || kind === 'water') {
      if (prev === null || curr === null) throw badRequest(`${kind} needs previous and current readings`);
      if (curr < prev) throw badRequest(`${kind}: current reading cannot be below the previous reading`);
      ratePer = rate !== null && Number.isFinite(rate)
        ? rate
        : (kind === 'electricity' ? config.electricity_rate : config.water_rate);
      amount = (curr - prev) * ratePer;
      auto = true;
    } else if (kind === 'trash') {
      amount = amountInput ?? config.trash_fee;
      auto = amountInput === null;
    } else if (kind === 'additional') {
      amount = amountInput ?? (() => {
        const fees = typeof config.additional_fees === 'string' ? JSON.parse(config.additional_fees) : (config.additional_fees ?? []);
        const match = fees.find((f) => f.name.toLowerCase() === label.toLowerCase());
        return match ? match.amount : 0;
      })();
      auto = amountInput === null;
    } else {
      // oneoff
      amount = amountInput ?? (quantity !== null && rate !== null ? rate * quantity : 0);
    }

    if (!Number.isFinite(amount) || amount < 0) throw badRequest(`Invalid amount for "${label || kind}"`);

    items.push({
      kind,
      label: label || kind,
      quantity: quantity !== null && Number.isFinite(quantity) ? money(quantity) : null,
      rate: ratePer !== null && Number.isFinite(ratePer) ? money(ratePer) : (rate !== null && Number.isFinite(rate) ? money(rate) : null),
      amount: money(amount),
      prev_reading: prev,
      curr_reading: curr,
      _auto: auto,
    });
    total += amount;
  }

  if (total <= 0) throw badRequest('A bill needs at least one item with an amount');
  return { items, total: money(total) };
}

/** Validate student/room references and figure the usage window. */
async function resolveRefs(ownerId, body, needStudent = true) {
  const refs = { student_id: null, room_id: null };

  if (body.student_id !== undefined && body.student_id !== null && body.student_id !== '') {
    const student = await one('SELECT id FROM students WHERE id = ? AND owner_user_id = ?', [body.student_id, ownerId]);
    if (!student) throw badRequest('Invalid student');
    refs.student_id = Number(body.student_id);
  } else if (needStudent) {
    throw badRequest('student_id is required');
  }

  if (body.room_id !== undefined && body.room_id !== null && body.room_id !== '') {
    const room = await one('SELECT id FROM rooms WHERE id = ? AND owner_user_id = ?', [body.room_id, ownerId]);
    if (!room) throw badRequest('Invalid room');
    refs.room_id = Number(body.room_id);
  } else if (refs.student_id) {
    const room = await one('SELECT id FROM rooms WHERE student_id = ?', [refs.student_id]);
    refs.room_id = room ? room.id : null;
  }

  return refs;
}

async function attachItems(bills) {
  if (bills.length === 0) return bills;
  const ids = bills.map((b) => b.id);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await q(`SELECT * FROM bill_items WHERE bill_id IN (${placeholders}) ORDER BY id`, ids);
  const byBill = new Map();
  for (const item of rows) {
    if (!byBill.has(item.bill_id)) byBill.set(item.bill_id, []);
    byBill.get(item.bill_id).push(item);
  }
  return bills.map((bill) => ({ ...bill, items: byBill.get(bill.id) ?? [] }));
}

billsRouter.get('/billing-config', async (req, res) => {
  const [rows] = await q('SELECT * FROM billing_config WHERE landlord_id = ?', [req.user.id]);
  if (rows.length === 0) return res.json({ configured: false });
  const config = rows[0];
  res.json({ configured: true, ...config, additional_fees: typeof config.additional_fees === 'string' ? JSON.parse(config.additional_fees) : (config.additional_fees ?? []) });
});

billsRouter.put('/billing-config', async (req, res) => {
  const config = parseConfig(req.body ?? {});
  await q(
    `INSERT INTO billing_config
       (landlord_id, home_name, default_room_fee, electricity_rate, water_rate, trash_fee, default_billing_day, first_bill_exclude_utilities, upfront_months, additional_fees)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       home_name = VALUES(home_name),
       default_room_fee = VALUES(default_room_fee),
       electricity_rate = VALUES(electricity_rate),
       water_rate = VALUES(water_rate),
       trash_fee = VALUES(trash_fee),
       default_billing_day = VALUES(default_billing_day),
       first_bill_exclude_utilities = VALUES(first_bill_exclude_utilities),
       upfront_months = VALUES(upfront_months),
       additional_fees = VALUES(additional_fees)`,
    [
      req.user.id,
      config.home_name,
      config.default_room_fee,
      config.electricity_rate,
      config.water_rate,
      config.trash_fee,
      config.default_billing_day,
      config.first_bill_exclude_utilities,
      config.upfront_months,
      config.additional_fees,
    ]
  );
  await logAudit(req.user.id, req.user.role, 'billing.config_updated', 'billing_config', req.user.id);
  const [rows] = await q('SELECT * FROM billing_config WHERE landlord_id = ?', [req.user.id]);
  const saved = rows[0];
  res.json({
    configured: true,
    ...saved,
    additional_fees: typeof saved.additional_fees === 'string' ? JSON.parse(saved.additional_fees ?? '[]') : (saved.additional_fees ?? []),
  });
});

billsRouter.get('/bills', async (req, res) => {
  const status = req.query.status;
  const studentId = Number(req.query.student_id);
  const statusClause = status ? 'AND b.status = ?' : '';
  const statusParams = status ? [status] : [];
  const studentClause = studentId > 0 ? 'AND b.student_id = ?' : '';
  const studentParams = studentId > 0 ? [studentId] : [];

  const [rows] = await q(
    `SELECT b.*, s.full_name AS student_name, r.title AS room_title
       FROM bills b
       LEFT JOIN students s ON s.id = b.student_id
       LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.landlord_id = ? ${statusClause} ${studentClause}
      ORDER BY b.period DESC, b.created_at DESC`,
    [req.user.id, ...statusParams, ...studentParams]
  );
  res.json(await attachItems(rows));
});

billsRouter.post('/bills/generate', async (req, res) => {
  const body = req.body ?? {};
  const period = parseMonth(body.period);
  if (!period) throw badRequest('period must be a valid month (YYYY-MM) or date (YYYY-MM-DD)');

  const config = await requireConfig(req.user.id);

  const [students] = await q(
    `SELECT s.id, r.id AS room_id
       FROM students s
       JOIN rooms r ON r.student_id = s.id
      WHERE s.owner_user_id = ?
        AND s.student_type = 'monthly'
      ORDER BY s.id`,
    [req.user.id]
  );

  const [, year, month] = period.match(/^(\d{4})-(\d{2})/);
  const lastDay = daysInMonth(Number(year), Number(month) - 1);
  const usageFrom = period;
  const usageTo = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  const dueDay = Math.min(config.default_billing_day, lastDay);
  const dueDate = `${year}-${month}-${String(dueDay).padStart(2, '0')}`;

  let created = 0;
  let skipped = 0;

  // The per-student existence check and the inserts run in one transaction with
  // a locking read so two concurrent generate calls for the same period cannot
  // both pass the check and double-issue bills (same fix as the itemized path).
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const student of students) {
      const [existingRows] = await conn.query(
        'SELECT id FROM bills WHERE landlord_id = ? AND student_id = ? AND period = ? FOR UPDATE',
        [req.user.id, student.id, period]
      );
      if (existingRows.length > 0) {
        skipped += 1;
        continue;
      }

      const rentAmount = config.default_room_fee > 0 ? config.default_room_fee : null;

      // First payment settings: exclude utilities + require upfront months.
      const priorRows = await conn.query('SELECT id FROM bills WHERE landlord_id = ? AND student_id = ?', [req.user.id, student.id]);
      const isFirst = priorRows[0].length === 0;
      const upfrontMonths = isFirst ? (config.upfront_months || 1) : 1;

      const [result] = await conn.query(
        `INSERT INTO bills (landlord_id, student_id, room_id, amount, period, usage_from, usage_to, due_date, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?)`,
        [
          req.user.id,
          student.id,
          student.room_id,
          rentAmount !== null ? rentAmount * upfrontMonths : 0,
          period,
          usageFrom,
          usageTo,
          dueDate,
          `Auto-generated for ${period}`,
        ]
      );
      const billId = result.insertId;

      if (rentAmount !== null) {
        await conn.query(
          'INSERT INTO bill_items (bill_id, kind, label, quantity, rate, amount) VALUES (?, ?, ?, ?, ?, ?)',
          [billId, 'rent', 'Room Rent', upfrontMonths, config.default_room_fee, rentAmount * upfrontMonths]
        );
      }

      created += 1;
      await logAudit(req.user.id, req.user.role, 'bill.generated', 'bills', billId);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  res.status(201).json({ created, skipped, period, usage_from: usageFrom, usage_to: usageTo, due_date: dueDate });
});

billsRouter.post('/bills', async (req, res) => {
  const body = req.body ?? {};

  // Legacy simple bill (amount only, no config required) — kept for API
  // compatibility. The dashboard UI always uses the itemized path.
  if (!Array.isArray(body.items)) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) throw badRequest('amount must be a positive number');
    const period = parseMonth(body.period);
    if (!period) throw badRequest('period must be a valid month (YYYY-MM) or date (YYYY-MM-DD)');
    const dueDate = parseDate(body.due_date);
    if (!dueDate) throw badRequest('due_date must be a valid date (YYYY-MM-DD)');
    const refs = await resolveRefs(req.user.id, body);

    // Same dedup + transaction treatment as the itemized path: concurrent (or
    // sloppy repeated) POSTs must not double-bill the same student period.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [openRows] = await conn.query(
        "SELECT id FROM bills WHERE landlord_id = ? AND student_id = ? AND (status = 'issued' OR (period = ? AND status <> 'paid')) FOR UPDATE",
        [req.user.id, refs.student_id, period]
      );
      if (openRows.length > 0) {
        throw badRequest('This student still has pending or overdue bills. Settle or delete those before opening a new cycle.');
      }

      const [result] = await conn.query(
        'INSERT INTO bills (landlord_id, student_id, room_id, amount, period, usage_from, usage_to, due_date, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'issued\', ?)',
        [req.user.id, refs.student_id, refs.room_id, amount, period, body.usage_from ?? period, body.usage_to ?? dueDate, dueDate, body.note ? String(body.note).slice(0, 255) : null]
      );

      await conn.commit();
      const bill = await one('SELECT * FROM bills WHERE id = ?', [result.insertId]);
      await logAudit(req.user.id, req.user.role, 'bill.created', 'bills', bill.id);
      return res.status(201).json({ ...bill, items: [] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Itemized bill (billing config required).
  const usageFrom = body.usage_from ? parseDate(body.usage_from) : null;
  const usageTo = body.usage_to ? parseDate(body.usage_to) : null;
  const period = parseMonth(body.period ?? body.usage_from);
  if (!usageFrom || !usageTo) throw badRequest('usage_from and usage_to are required (YYYY-MM-DD)');
  if (usageTo < usageFrom) throw badRequest('usage_to must be on or after usage_from');
  const dueDate = parseDate(body.due_date);
  if (!dueDate) throw badRequest('due_date must be a valid date (YYYY-MM-DD)');
  if (!period) throw badRequest('A valid billing month is required');

  const refs = await resolveRefs(req.user.id, body);
  if (!refs.student_id) throw badRequest('student_id is required');

  const { items, total } = await buildItems(req.user.id, body);

  // The open-bill check and the INSERT run in a transaction with a locking
  // read so two concurrent POSTs cannot both pass the check and create
  // duplicate open bills for the same student (race condition). FOR UPDATE
  // serializes on the matching rows / gap, so the second request re-evaluates
  // the check against the committed data of the first.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [openRows] = await conn.query(
      "SELECT id FROM bills WHERE landlord_id = ? AND student_id = ? AND (status = 'issued' OR (period = ? AND status <> 'paid')) FOR UPDATE",
      [req.user.id, refs.student_id, period]
    );
    if (openRows.length > 0) {
      throw badRequest('This student still has pending or overdue bills. Settle or delete those before opening a new cycle.');
    }

    const [result] = await conn.query(
      'INSERT INTO bills (landlord_id, student_id, room_id, amount, period, usage_from, usage_to, due_date, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'issued\', ?)',
      [
        req.user.id, refs.student_id, refs.room_id, total, period, usageFrom, usageTo, dueDate,
        body.note ? String(body.note).slice(0, 255) : null,
      ]
    );
    const billId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO bill_items (bill_id, kind, label, quantity, rate, amount, prev_reading, curr_reading) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [billId, item.kind, item.label, item.quantity, item.rate, item.amount, item.prev_reading, item.curr_reading]
      );
    }

    await conn.commit();

    const bill = await one('SELECT * FROM bills WHERE id = ?', [billId]);
    await logAudit(req.user.id, req.user.role, 'bill.created', 'bills', bill.id);
    res.status(201).json({ ...bill, items });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

billsRouter.patch('/bills/:id', async (req, res) => {
  const bill = await ownBill(req.user.id, req.params.id);
  if (bill.status === 'paid') throw badRequest('Paid bills cannot be edited');

  const body = req.body ?? {};
  const updates = [];
  const params = [];

  if (body.usage_from !== undefined) {
    const d = parseDate(body.usage_from);
    if (!d) throw badRequest('usage_from must be a valid date (YYYY-MM-DD)');
    updates.push('usage_from = ?');
    params.push(d);
  }
  if (body.usage_to !== undefined) {
    const d = parseDate(body.usage_to);
    if (!d) throw badRequest('usage_to must be a valid date (YYYY-MM-DD)');
    updates.push('usage_to = ?');
    params.push(d);
  }
  if (body.due_date !== undefined) {
    const d = parseDate(body.due_date);
    if (!d) throw badRequest('due_date must be a valid date (YYYY-MM-DD)');
    updates.push('due_date = ?');
    params.push(d);
  }
  if (body.note !== undefined) {
    updates.push('note = ?');
    params.push(body.note === null ? null : String(body.note).slice(0, 255));
  }

  // Itemized edit: recompute totals and replace the line items.
  let newItems = null;
  let newTotal = null;
  if (Array.isArray(body.items)) {
    const built = await buildItems(req.user.id, body);
    newItems = built.items;
    newTotal = built.total;
    updates.push('amount = ?');
    params.push(newTotal);
  }

  if (newItems) {
    const from = body.usage_from !== undefined ? parseDate(body.usage_from) : bill.usage_from ?? bill.period;
    const to = body.usage_to !== undefined ? parseDate(body.usage_to) : bill.usage_to ?? bill.due_date;
    if (to < from) throw badRequest('usage_to must be on or after usage_from');
  }

  if (updates.length > 0) {
    params.push(req.params.id, req.user.id);
    await q(`UPDATE bills SET ${updates.join(', ')} WHERE id = ? AND landlord_id = ?`, params);
  }
  if (newItems) {
    await q('DELETE FROM bill_items WHERE bill_id = ?', [req.params.id]);
    for (const item of newItems) {
      await q(
        'INSERT INTO bill_items (bill_id, kind, label, quantity, rate, amount, prev_reading, curr_reading) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, item.kind, item.label, item.quantity, item.rate, item.amount, item.prev_reading, item.curr_reading]
      );
    }
  }

  await logAudit(req.user.id, req.user.role, 'bill.updated', 'bills', req.params.id);
  const updated = await one('SELECT * FROM bills WHERE id = ?', [req.params.id]);
  // Metadata-only updates skip the bill_items rewrite above; fetch the stored
  // line items so the response never reports an empty list for a bill that
  // still has items (would break the frontend detail view after editing).
  const items = newItems ?? ((await q('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id', [req.params.id]))[0] ?? []);
  res.json({ ...updated, items });
});

billsRouter.patch('/bills/:id/mark-paid', async (req, res) => {
  const bill = await ownBill(req.user.id, req.params.id);
  if (bill.status === 'paid') throw badRequest('Bill is already paid');

  await q('UPDATE bills SET status = ?, paid_at = ? WHERE id = ?', ['paid', new Date(), bill.id]);
  await logAudit(req.user.id, req.user.role, 'bill.marked_paid', 'bills', bill.id);
  res.json(await one('SELECT * FROM bills WHERE id = ?', [bill.id]));
});

billsRouter.patch('/bills/:id/resend', async (req, res) => {
  await ownBill(req.user.id, req.params.id);

  await q('UPDATE bills SET sent_at = ? WHERE id = ?', [new Date(), req.params.id]);
  await logAudit(req.user.id, req.user.role, 'bill.resent', 'bills', req.params.id);
  res.json(await one('SELECT * FROM bills WHERE id = ?', [req.params.id]));
});

billsRouter.delete('/bills/:id', async (req, res) => {
  const bill = await ownBill(req.user.id, req.params.id);
  if (bill.status === 'paid') throw badRequest('Paid bills cannot be deleted');

  const [result] = await q('DELETE FROM bills WHERE id = ? AND landlord_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw notFound('Bill not found');
  await logAudit(req.user.id, req.user.role, 'bill.deleted', 'bills', req.params.id);
  res.status(204).end();
});