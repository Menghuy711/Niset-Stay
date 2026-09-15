import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { settings } from './config.js';
import { uploadsRouter, UPLOAD_DIR } from './routes/uploads.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { landlordRouter } from './routes/landlord.js';
import { dashboardRouter } from './routes/dashboard.js';
import { floorsRouter } from './routes/floors.js';
import { studentsRouter } from './routes/students.js';
import { billsRouter } from './routes/bills.js';
import { managementFeesRouter } from './routes/management-fees.js';
import { mapLinkRouter } from './routes/map-link.js';
import { roomsRouter, universitiesRouter } from './routes/rooms.js';
import { bookingsRouter } from './routes/bookings.js';
import { adminRouter } from './routes/admin.js';
import { feedbackRouter } from './routes/feedback.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  settings.validate();

  const app = express();

  // Only trust proxy headers when actually deployed behind a reverse proxy.
  // Without this, every req.ip-keyed rate limiter (login/register/upload)
  // collapses into one global bucket behind Cloudflare/Nginx in production.
  if (process.env.NODE_ENV === 'production') {
    const hops = Number(process.env.TRUST_PROXY_HOPS) || 1;
    app.set('trust proxy', hops);
  }

  // Minimal security headers (no dependency). nosniff especially matters for
  // /uploads: it stops browsers from sniffing a polyglot image/HTML as text.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  app.use(cors({ origin: settings.allowedOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use('/uploads', express.static(UPLOAD_DIR));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/landlord', landlordRouter);
  app.use('/api/landlord', dashboardRouter);
  app.use('/api/landlord', floorsRouter);
  app.use('/api/landlord', studentsRouter);
  app.use('/api/landlord', billsRouter);
  app.use('/api/landlord', managementFeesRouter);
  app.use('/api/landlord', mapLinkRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/universities', universitiesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/uploads', uploadsRouter);

  app.get('/', (_req, res) => {
    res.json({ message: 'Niset Stay API is running' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}