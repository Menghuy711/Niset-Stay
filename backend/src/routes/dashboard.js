import { Router } from 'express';
import { q } from '../db.js';
import { requireLandlord } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireLandlord);

function fmtMonthStart(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function fmtMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

dashboardRouter.get('/dashboard', async (req, res) => {
  const me = req.user.id;

  const [[floors]] = await q('SELECT COUNT(*) AS n FROM floors WHERE owner_user_id = ?', [me]);
  const [[rooms]] = await q('SELECT COUNT(*) AS n FROM rooms WHERE owner_user_id = ?', [me]);
  const [[occupied]] = await q(
    "SELECT COUNT(*) AS n FROM rooms WHERE owner_user_id = ? AND status = 'occupied'",
    [me]
  );
  const [[students]] = await q('SELECT COUNT(*) AS n FROM students WHERE owner_user_id = ?', [me]);
  const [[pendingBills]] = await q(
    "SELECT COUNT(*) AS n FROM bills WHERE landlord_id = ? AND status = 'issued'",
    [me]
  );
  const [[overdueBills]] = await q(
    "SELECT COUNT(*) AS n FROM bills WHERE landlord_id = ? AND status = 'issued' AND due_date < CURDATE()",
    [me]
  );

  // ── Income: last 6 calendar months (billing `period` month) ────────
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [trendRows] = await q(
    `SELECT DATE_FORMAT(period, '%Y-%m') AS ym,
            COALESCE(SUM(amount), 0) AS expected,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected
       FROM bills
      WHERE landlord_id = ?
        AND period BETWEEN ? AND ?
      GROUP BY ym
      ORDER BY ym`,
    [me, fmtMonthStart(rangeStart), fmtMonthStart(currentStart)]
  );
  const byKey = new Map(trendRows.map((r) => [r.ym, r]));
  const trend = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = fmtMonthKey(d);
    const row = byKey.get(key);
    trend.push({
      month: key,
      expected: Number(row?.expected ?? 0),
      collected: Number(row?.collected ?? 0),
    });
  }

  const [[currentMonth]] = await q(
    `SELECT COALESCE(SUM(amount), 0) AS expected,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected
       FROM bills
      WHERE landlord_id = ? AND period = ?`,
    [me, fmtMonthStart(currentStart)]
  );

  const [recentBills] = await q(
    `SELECT b.*, s.full_name AS student_name, r.title AS room_title
       FROM bills b
       LEFT JOIN students s ON s.id = b.student_id
       LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.landlord_id = ?
      ORDER BY b.created_at DESC
      LIMIT 6`,
    [me]
  );

  const totalRooms = rooms.n;
  res.json({
    metrics: {
      floors: floors.n,
      totalRooms,
      availableRooms: totalRooms - occupied.n,
      occupiedRooms: occupied.n,
      occupancyRate: totalRooms ? Math.round((occupied.n / totalRooms) * 100) : 0,
      students: students.n,
      pendingBills: pendingBills.n,
      overdueBills: overdueBills.n,
    },
    incomeTrend: trend,
    currentMonthIncome: {
      expected: Number(currentMonth.expected),
      collected: Number(currentMonth.collected),
    },
    recentBills,
  });
});