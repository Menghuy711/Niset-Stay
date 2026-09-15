import { Router } from 'express';
import { q, one } from '../db.js';
import { requireLandlord, notFound, badRequest } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';
import { parseDateYMD as parseDate } from '../dateutil.js';

export const managementFeesRouter = Router();

managementFeesRouter.use(requireLandlord);

const ADDON = 'management_fees';

const CURRENCIES = ['USD', 'KHR', 'EUR', 'GBP', 'THB', 'VND', 'AUD'];
const MONTH_INDEX = { monthly: 1, yearly: 12 };

function localDateKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

// mysql2 returns MySQL DATE columns as JS Date objects, while our API
// compares them against 'YYYY-MM-DD' string keys. Normalize either shape to
// a local YYYY-MM-DD before comparing or exposing it.
function dateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localDateKey(value);
  const s = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function serializeFee(raw) {
  return {
    ...raw,
    period_start: dateKey(raw.period_start),
    period_end: dateKey(raw.period_end),
    due_date: dateKey(raw.due_date),
    paid_at: raw.paid_at ? dateKey(raw.paid_at) : null,
    line_items: typeof raw.line_items === 'string' ? JSON.parse(raw.line_items) : (raw.line_items ?? []),
  };
}

function expiryFor(plan, from = new Date()) {
  const addMonths = MONTH_INDEX[plan] ?? 1;
  const d = new Date(from.getFullYear(), from.getMonth() + addMonths, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = Math.min(from.getDate(), lastDay);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dayStr}`;
}

async function ownFee(ownerId, feeId) {
  const fee = await one('SELECT * FROM management_fees WHERE id = ? AND landlord_id = ?', [feeId, ownerId]);
  if (!fee) throw notFound('Management fee not found');
  return fee;
}

async function getAddon(ownerId) {
  const addon = await one('SELECT * FROM landlord_addons WHERE owner_user_id = ? AND addon = ?', [ownerId, ADDON]);
  if (!addon) {
    return { enabled: false, status: 'none', plan: null, activated_at: null, expires_at: null };
  }
  const today = localDateKey();
  const expired = addon.status === 'active' && dateKey(addon.expires_at) < today;
  const status = expired ? 'expired' : addon.status;
  return {
    enabled: status === 'active',
    status,
    plan: addon.plan,
    activated_at: addon.started_at ? dateKey(addon.started_at) : null,
    expires_at: addon.expires_at ? dateKey(addon.expires_at) : null,
  };
}

async function requireEnabled(ownerId) {
  const addon = await getAddon(ownerId);
  if (!addon.enabled) throw badRequest('The Management Fees add-on is not active. Renew it before creating new invoices.');
  return addon;
}

managementFeesRouter.get('/management-fees/addon', async (req, res) => {
  res.json(await getAddon(req.user.id));
});

managementFeesRouter.post('/management-fees/addon', async (req, res) => {
  const body = req.body ?? {};
  const plan = body.plan;
  if (plan !== 'monthly' && plan !== 'yearly') throw badRequest('plan must be "monthly" or "yearly"');

  const today = localDateKey();
  const expiresAt = expiryFor(plan);
  const existing = await one('SELECT id FROM landlord_addons WHERE owner_user_id = ? AND addon = ?', [req.user.id, ADDON]);

  if (existing) {
    await q(
      "UPDATE landlord_addons SET plan = ?, started_at = ?, expires_at = ?, status = 'active' WHERE id = ?",
      [plan, today, expiresAt, existing.id]
    );
  } else {
    await q(
      "INSERT INTO landlord_addons (owner_user_id, addon, plan, started_at, expires_at, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [req.user.id, ADDON, plan, today, expiresAt]
    );
  }

  const row = await one('SELECT id FROM landlord_addons WHERE owner_user_id = ? AND addon = ?', [req.user.id, ADDON]);
  await logAudit(req.user.id, req.user.role, 'addon.subscribed', 'landlord_addons', row.id);
  res.status(201).json(await getAddon(req.user.id));
});

managementFeesRouter.post('/management-fees/addon/cancel', async (req, res) => {
  const addon = await getAddon(req.user.id);
  if (!addon.enabled) throw badRequest('There is no active add-on to cancel');

  await q("UPDATE landlord_addons SET status = 'cancelled' WHERE owner_user_id = ? AND addon = ?", [req.user.id, ADDON]);
  const row = await one('SELECT id FROM landlord_addons WHERE owner_user_id = ? AND addon = ?', [req.user.id, ADDON]);
  await logAudit(req.user.id, req.user.role, 'addon.cancelled', 'landlord_addons', row.id);
  res.json(await getAddon(req.user.id));
});

managementFeesRouter.get('/management-fees', async (req, res) => {
  const roomId = Number(req.query.room_id);
  const roomClause = roomId > 0 ? 'AND f.room_id = ?' : '';
  const roomParams = roomId > 0 ? [roomId] : [];

  const [rows] = await q(
    `SELECT f.*, r.title AS room_title
       FROM management_fees f
       LEFT JOIN rooms r ON r.id = f.room_id
      WHERE f.landlord_id = ? ${roomClause}
      ORDER BY f.created_at DESC, f.id DESC`,
    [req.user.id, ...roomParams]
  );

  const today = localDateKey();
  res.json(rows.map((fee) => ({
    ...serializeFee(fee),
    display_status:
      fee.status === 'paid'
        ? 'paid'
        : dateKey(fee.due_date) !== '' && dateKey(fee.due_date) < today
          ? 'overdue'
          : 'pending',
  })));
});

managementFeesRouter.post('/management-fees', async (req, res) => {
  const body = req.body ?? {};
  await requireEnabled(req.user.id);

  const roomId = Number(body.room_id);
  if (!Number.isFinite(roomId) || roomId <= 0) throw badRequest('room_id is required');
  const room = await one('SELECT id FROM rooms WHERE id = ? AND owner_user_id = ?', [roomId, req.user.id]);
  if (!room) throw badRequest('Invalid room');

  const periodStart = parseDate(body.period_start);
  if (!periodStart) throw badRequest('period_start must be a valid date (YYYY-MM-DD)');
  const periodEnd = parseDate(body.period_end);
  if (!periodEnd) throw badRequest('period_end must be a valid date (YYYY-MM-DD)');
  if (periodEnd < periodStart) throw badRequest('period_end must be on or after period_start');

  const dueDate = parseDate(body.due_date);
  if (!dueDate) throw badRequest('due_date must be a valid date (YYYY-MM-DD)');
  if (dueDate < periodStart) throw badRequest('due_date cannot be before the service period starts');

  let currency = 'USD';
  if (body.currency) {
    currency = String(body.currency).trim().toUpperCase();
    if (!CURRENCIES.includes(currency)) throw badRequest('Unsupported currency');
  }

  const lineItems = Array.isArray(body.line_items) ? body.line_items : body.line_items ? [body.line_items] : [];
  if (lineItems.length === 0) throw badRequest('At least one line item is required');

  const normalized = [];
  let total = 0;
  for (const item of lineItems) {
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (!description) throw badRequest('Every line item needs a description');
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0) throw badRequest(`Invalid amount for "${description}"`);
    const quantity = item.quantity === undefined || item.quantity === null || item.quantity === '' ? 1 : Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) throw badRequest(`Invalid quantity for "${description}"`);
    total += amount * (quantity || 1);
    normalized.push({ description, quantity: quantity || 1, amount: Math.round(amount * 100) / 100 });
  }
  total = Math.round(total * 100) / 100;

  const [result] = await q(
    `INSERT INTO management_fees
       (landlord_id, room_id, owner_name, owner_contact, period_start, period_end, due_date, currency, line_items, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.user.id,
      roomId,
      body.owner_name ? String(body.owner_name).trim().slice(0, 255) || null : null,
      body.owner_contact ? String(body.owner_contact).trim().slice(0, 255) || null : null,
      periodStart,
      periodEnd,
      dueDate,
      currency,
      JSON.stringify(normalized),
      total,
    ]
  );

  const fee = await one('SELECT * FROM management_fees WHERE id = ?', [result.insertId]);
  await logAudit(req.user.id, req.user.role, 'management_fee.created', 'management_fees', fee.id);
  res.status(201).json(serializeFee(fee));
});

managementFeesRouter.patch('/management-fees/:id/mark-paid', async (req, res) => {
  const fee = await ownFee(req.user.id, req.params.id);
  if (fee.status === 'paid') throw badRequest('This invoice is already paid');

  await q("UPDATE management_fees SET status = 'paid', paid_at = ? WHERE id = ?", [new Date(), fee.id]);
  await logAudit(req.user.id, req.user.role, 'management_fee.marked_paid', 'management_fees', fee.id);
  res.json(serializeFee(await one('SELECT * FROM management_fees WHERE id = ?', [fee.id])));
});

managementFeesRouter.delete('/management-fees/:id', async (req, res) => {
  const fee = await ownFee(req.user.id, req.params.id);
  if (fee.status === 'paid') throw badRequest('Paid invoices cannot be deleted');

  const [result] = await q('DELETE FROM management_fees WHERE id = ? AND landlord_id = ?', [fee.id, req.user.id]);
  if (result.affectedRows === 0) throw notFound('Management fee not found');
  await logAudit(req.user.id, req.user.role, 'management_fee.deleted', 'management_fees', fee.id);
  res.status(204).end();
});