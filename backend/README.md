# Backend (Express + MySQL)

REST API for Niset Stay. JWT auth, rooms CRUD (admin-only writes), bookings, image uploads.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then edit DB credentials / SECRET_KEY
```

Create the database by running `../database/schema.sql` in phpMyAdmin or the MySQL client.

> The server runs on **port 3000** (was 8000 on FastAPI). The frontend already points there via `frontend/.env` (`VITE_API_BASE_URL`).

## Run

```bash
npm run dev     # auto-reloads on change (node --watch)
# API:      http://localhost:3000
# Uploads:  http://localhost:3000/uploads/  (static files)
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Login, returns `{access_token}` (JSON body, rate-limited 10/min) |
| GET | `/api/auth/me` | user | Current profile |
| POST | `/api/auth/forgot-password` | – | Returns `reset_token` (dev mode, no email, rate-limited 5/min) |
| POST | `/api/auth/reset-password` | – | Reset with `{token, new_password}` (15 min TTL) |
| GET | `/api/rooms` | – | List rooms (`?limit=`, `?skip=`, `?near=<university_id>`, `?max_km=<n>` — proximity, sorted by distance) |
| GET | `/api/universities` | – | Campus list (id, name, short_name, latitude, longitude) |
| GET | `/api/rooms/{id}` | – | Room detail |
| POST/PUT/DELETE | `/api/rooms[/{id}]` | admin | Manage rooms |
| POST | `/api/bookings` | user | Create booking |
| GET | `/api/bookings/my` | user | My bookings |
| GET | `/api/admin/stats` | admin | Dashboard counters |
| GET | `/api/admin/users`, `/rooms`, `/bookings` | admin | Lists (users: admin sees students & landlords only; super_admin sees all) |
| GET/PATCH | `/api/users`, `/api/users/{id}` | admin | User administration (admin: students & landlords; super_admin: all roles) |
| PATCH | `/api/admin/bookings/{id}` | admin | Update booking status |
| POST | `/api/admin/bookings/{id}/checkin` | admin | Mark checked in (status must be confirmed) |
| POST | `/api/admin/bookings/{id}/checkout` | admin | Mark checked out; sets `total_price` if missing |
| POST | `/api/uploads` | admin | Upload PNG/JPG/WEBP ≤5MB → `{url: "/uploads/..."}` (magic-byte validated) |
| DELETE | `/api/uploads/{filename}` | admin | Delete uploaded file |

## Structure

- `src/server.js` — entry point, starts the app on `PORT` (default 3000)
- `src/app.js` — app factory, CORS, static uploads mount, router registration
- `src/config.js` — env settings (`.env`)
- `src/db.js` — mysql2 connection pool; DECIMAL columns returned as JS numbers
- `src/security.js` — bcrypt hashing + JWT (incl. short-lived reset tokens)
- `src/middleware/auth.js` — `requireAuth` / `requireAdmin` guards + `HttpError` helpers
- `src/middleware/error.js` — JSON error handler (`{"detail": "..."}` shape)
- `src/routes/auth.js, rooms.js, bookings.js, admin.js, uploads.js`

> Set a strong `SECRET_KEY` in `.env` before any real deployment.

## API compatibility

The response contract matches the old FastAPI backend 1:1 — errors are returned as
`{"detail": "..."}` and logins use a JSON body (`{email, password}`), which the frontend
`src/lib/api.js` already expects.