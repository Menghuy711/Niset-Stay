import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, badRequest } from '../middleware/auth.js';
import { logAudit } from '../auditLib.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', requireAuth, async (req, res) => {
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim()) {
    throw badRequest('message is required');
  }
  if (message.trim().length > 5000) {
    throw badRequest('message must be at most 5000 characters');
  }

  await q('INSERT INTO feedback_messages (user_id, message) VALUES (?, ?)', [
    req.user.id,
    message.trim(),
  ]);
  await logAudit(req.user.id, req.user.role, 'feedback.sent', 'feedback_messages', req.user.id);
  res.status(201).json({ detail: 'Thanks! Your feedback has been sent to the team.' });
});