import { Router } from 'express';
import { q, one } from '../db.js';
import { requireLandlord, notFound, badRequest } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';

export const floorsRouter = Router();

// Floor management is open to landlords and (as an audit aid) staff.
floorsRouter.use(requireLandlord);

async function ownFloor(ownerId, floorId) {
  const floor = await one('SELECT * FROM floors WHERE id = ? AND owner_user_id = ?', [floorId, ownerId]);
  if (!floor) throw notFound('Floor not found');
  return floor;
}

floorsRouter.get('/floors', async (req, res) => {
  const [rows] = await q(
    `SELECT f.*, COUNT(r.id) AS room_count,
            COALESCE(SUM(r.status = 'occupied'), 0) AS occupied_count
       FROM floors f
       LEFT JOIN rooms r ON r.floor_id = f.id
      WHERE f.owner_user_id = ?
      GROUP BY f.id
      ORDER BY f.id`,
    [req.user.id]
  );
  res.json(rows);
});

floorsRouter.post('/floors', async (req, res) => {
  const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
  if (!label) throw badRequest('label is required');

  const [result] = await q('INSERT INTO floors (owner_user_id, label) VALUES (?, ?)', [req.user.id, label]);
  const floor = await one('SELECT * FROM floors WHERE id = ?', [result.insertId]);
  await logAudit(req.user.id, req.user.role, 'floor.created', 'floors', floor.id);
  res.status(201).json(floor);
});

floorsRouter.patch('/floors/:id', async (req, res) => {
  await ownFloor(req.user.id, req.params.id);

  const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
  if (!label) throw badRequest('label is required');

  await q('UPDATE floors SET label = ? WHERE id = ?', [label, req.params.id]);
  await logAudit(req.user.id, req.user.role, 'floor.updated', 'floors', req.params.id);
  res.json(await one('SELECT * FROM floors WHERE id = ?', [req.params.id]));
});

floorsRouter.delete('/floors/:id', async (req, res) => {
  await ownFloor(req.user.id, req.params.id);

  // The rooms.floor_id FK is ON DELETE CASCADE, so deleting a floor would
  // silently wipe every room on it (and SET NULL their bookings/bills).
  // Enforce the same guards the room-delete routes do before allowing it.
  const [[occupied]] = await q(
    'SELECT COUNT(*) AS n FROM rooms WHERE floor_id = ? AND student_id IS NOT NULL',
    [req.params.id]
  );
  if (occupied.n > 0) {
    throw badRequest('Cannot delete a floor that has rooms with assigned students. Unassign or delete those rooms first.');
  }

  const [[active]] = await q(
    "SELECT COUNT(*) AS n FROM rooms WHERE floor_id = ? AND id IN (SELECT room_id FROM bookings WHERE status IN ('pending', 'confirmed'))",
    [req.params.id]
  );
  if (active.n > 0) {
    throw badRequest('Cannot delete a floor that has rooms with pending or confirmed bookings. Cancel them first.');
  }

  const [result] = await q('DELETE FROM floors WHERE id = ? AND owner_user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) throw notFound('Floor not found');
  await logAudit(req.user.id, req.user.role, 'floor.deleted', 'floors', req.params.id);
  res.status(204).end();
});