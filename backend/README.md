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
| POST | `/api/auth/reset-password` | – | Reset with `{token, new_password}` (15 min TTL, rate-limited 5/min) |
| GET | `/api/users/me` | user | Get own profile |
| PATCH | `/api/users/me` | user | Update own profile |
| GET | `/api/users` | admin | List users (admin: students & landlords; super_admin: all roles) |
| PATCH | `/api/users/{id}` | admin | Update user (admin: students & landlords; super_admin: all roles) |
| GET | `/api/rooms` | – | List rooms (`?limit=`, `?skip=`, `?near=<university_id>`, `?max_km=<n>` — proximity, sorted by distance) |
| GET | `/api/universities` | – | Campus list (id, name, short_name, latitude, longitude) |
| GET | `/api/rooms/{id}` | – | Room detail |
| POST/PUT/DELETE | `/api/rooms[/{id}]` | admin | Manage rooms |
| POST | `/api/bookings` | user | Create booking |
| GET | `/api/bookings/my` | user | My bookings |
| POST | `/api/feedback` | user | Submit feedback for a booking |
| **Landlord portal** (`/api/landlord`) |||
| GET/PATCH | `/api/landlord/home` | user | Landlord home page content (profile, stats, configuration) |
| GET | `/api/landlord/stats` | landlord + staff | Landlord dashboard counters |
| GET | `/api/landlord/rooms` | landlord + staff | Landlord's room list (rooms they own) |
| POST/PUT/DELETE | `/api/landlord/rooms[/{id}]` | landlord + staff | Landlord room CRUD |
| PATCH | `/api/landlord/rooms/{id}/assign` | landlord + staff | Assign a student to a room |
| PATCH | `/api/landlord/rooms/{id}/unassign` | landlord + staff | Unassign a student from a room |
| GET | `/api/landlord/bookings` | landlord + staff | Landlord's booking list |
| PATCH | `/api/landlord/bookings/{id}` | landlord + staff | Landlord update booking status |
| GET | `/api/landlord/floors` | landlord + staff | Landlord's floor list |
| POST/PATCH/DELETE | `/api/landlord/floors[/{id}]` | landlord + staff | Landlord floor CRUD |
| GET | `/api/landlord/students` | landlord + staff | Landlord's student list |
| POST/PATCH/DELETE | `/api/landlord/students[/{id}]` | landlord + staff | Landlord student CRUD |
| GET | `/api/landlord/billing-config` | landlord + staff | Read billing config (per-room default month) |
| PUT | `/api/landlord/billing-config` | landlord + staff | Update billing config |
| GET | `/api/landlord/bills` | landlord + staff | Landlord's bill list (includes items) |
| POST | `/api/landlord/bills/generate` | landlord + staff | Auto-generate bill items for a month |
| POST | `/api/landlord/bills` | landlord + staff | Create a manual bill |
| PATCH | `/api/landlord/bills/{id}` | landlord + staff | Update a bill |
| PATCH | `/api/landlord/bills/{id}/mark-paid` | landlord + staff | Mark bill paid |
| PATCH | `/api/landlord/bills/{id}/resend` | landlord + staff | Resend bill notification |
| DELETE | `/api/landlord/bills/{id}` | landlord + staff | Delete a bill |
| GET | `/api/landlord/management-fees` | landlord + staff | List management fees |
| POST | `/api/landlord/management-fees` | landlord + staff | Create management fee |
| PATCH | `/api/landlord/management-fees/{id}/mark-paid` | landlord + staff | Mark fee paid |
| DELETE | `/api/landlord/management-fees/{id}` | landlord + staff | Delete management fee |
| GET | `/api/landlord/management-fees/addon` | landlord + staff | Get addon subscription status |
| POST | `/api/landlord/management-fees/addon` | landlord + staff | Subscribe to addon |
| POST | `/api/landlord/management-fees/addon/cancel` | landlord + staff | Cancel addon |
| POST | `/api/landlord/parse-map-link` | landlord + staff | Parse Google Maps URL → address/district/lat/lng |
| **Admin portal** (`/api/admin`) |||
| GET | `/api/admin/stats` | admin | Dashboard counters |
| GET | `/api/admin/users` | admin | Admin user list |
| GET | `/api/admin/rooms` | admin | Admin room list |
| GET | `/api/admin/bookings` | admin | Admin booking list |
| GET | `/api/admin/audit-logs` | super_admin | Audit log list |
| PATCH | `/api/admin/bookings/{id}` | admin | Update booking status |
| POST | `/api/admin/bookings/{id}/checkin` | admin | Mark checked in (status must be confirmed) |
| POST | `/api/admin/bookings/{id}/checkout` | admin | Mark checked out; sets `total_price` if missing |
| **Uploads** |||
| POST | `/api/uploads` | landlord + staff | Upload PNG/JPG/WEBP ≤5MB → `{url: "/uploads/..."}` (magic-byte validated) |
| DELETE | `/api/uploads/{filename}` | landlord + staff | Delete uploaded file |

## Structure

- `src/server.js` — entry point, starts the app on `PORT` (default 3000)
- `src/app.js` — app factory, CORS, static uploads mount, router registration
- `src/config.js` — env settings (`.env`)
- `src/db.js` — mysql2 connection pool; DECIMAL columns returned as JS numbers
- `src/security.js` — bcrypt hashing + JWT (incl. short-lived reset tokens)
- `src/middleware/auth.js` — `requireAuth` / `requireRole` guards (`requireAdmin`, `requireSuperAdmin`, `requireLandlord`) + `HttpError` helpers
- `src/middleware/error.js` — JSON error handler (`{"detail": "..."}` shape)
- `src/routes/` — `auth.js, users.js, rooms.js, bookings.js, landlord.js, dashboard.js, bills.js, floors.js, students.js, management-fees.js, map-link.js, admin.js, feedback.js, uploads.js`

> Set a strong `SECRET_KEY` in `.env` before any real deployment.

## API compatibility

The response contract matches the old FastAPI backend 1:1 — errors are returned as
`{"detail": "..."}` and logins use a JSON body (`{email, password}`), which the frontend
`src/lib/api.js` already expects.