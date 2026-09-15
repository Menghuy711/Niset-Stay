import multer from 'multer';
import { HttpError } from './auth.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ detail: 'Not Found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    res.status(err.status).set(err.headers).json({ detail: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const detail = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB)' : err.message;
    res.status(400).json({ detail });
    return;
  }
  // Malformed JSON body (from express.json()).
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ detail: 'Request body is not valid JSON' });
    return;
  }
if (err?.code === 'ER_DUP_ENTRY') {
  const hint = (err?.sqlMessage ?? '').toLowerCase();
  let detail = 'Resource already exists';
  if (hint.includes('users') || hint.includes('email')) detail = 'Email already registered';
  else if (hint.includes('landlord_addons') || hint.includes('uq_addon_owner')) detail = 'This management fees add-on is already active for your account';
  else if (hint.includes('password_reset_tokens') || hint.includes('token_hash')) detail = 'This reset link has already been used';
  else if (hint.includes('bookings') || hint.includes('idx_one_active_booking')) detail = 'A booking for this room already exists';
  res.status(400).json({ detail });
  return;
}
  console.error(err);
  res.status(500).json({ detail: 'Internal server error' });
}