import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { settings } from '../config.js';
import { requireLandlord, badRequest, forbidden } from '../middleware/auth.js';

export const UPLOAD_DIR = path.join(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))), 'uploads');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = 5 * 1024 * 1024;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE } });

function detectImage(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

export const uploadsRouter = Router();

const isProd = process.env.NODE_ENV === 'production';
const uploadLimit = settings.debug && !isProd ? 100 : 20;
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: uploadLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (_req, res) => res.status(429).json({ detail: 'Rate limit exceeded: too many uploads' }),
});

// Uploaded names embed the uploader's user id so a DELETE can be scoped to the
// actor who created the file (`<userId>-<32hex>.<ext>`).
const UPLOAD_NAME_RE = /^(\d+)-[a-f0-9]{32}\.(png|jpg|webp)$/;

uploadsRouter.post('/', requireLandlord, uploadLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) throw badRequest('file is required');

  const detected = detectImage(req.file.buffer);
  if (!detected) {
    throw badRequest('Invalid file type. Only PNG, JPEG, and WEBP images are allowed.');
  }

  const filename = `${req.user.id}-${randomUUID().replace(/-/g, '')}.${detected.ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer);
  res.json({ url: `/uploads/${filename}` });
});

// Only ever unlink a file we generated ourselves (`<userId>-<32hex>.<ext>`).
// Deletion is limited to the uploader (or staff, who may police uploads) so one
// landlord cannot delete another account's images.
uploadsRouter.delete('/:filename', requireLandlord, async (req, res) => {
  const name = req.params.filename;
  const match = UPLOAD_NAME_RE.exec(name);
  if (!match) {
    throw badRequest('Invalid filename');
  }
  if (Number(match[1]) !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
    throw forbidden('You can only delete images you uploaded');
  }
  const file = path.join(UPLOAD_DIR, name);
  // Deleting a missing/locked file is idempotent from the callers' view.
  await fs.rm(file, { force: true });
  res.status(204).end();
});