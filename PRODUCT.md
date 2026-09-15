# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary: university students looking for a rental room near campus. They browse, compare, and book a room that feels like a quiet, comfortable home — not just a bed.
- Secondary: landlords who list and manage their own rooms, and see bookings for them, through the landlord portal.
- Staff/admin: manage room listings, bookings, users, check-in/check-out, and site content through the admin dashboard.

## Product Purpose

Niset Stay is a student-housing website: browse available rooms, see details and amenities, and book a room online. Success is a student finding and securing a space that feels like home, and an admin reliably running listings and bookings end to end.

## Positioning

A student-focused sanctuary adjacent to university life — the copy treats the product as a "quiet, comfortable home for university students," not a generic room directory. The campus-adjacent, student-first frame is the claim a generic rental site could not truthfully copy.

## Operating Context

- Room discovery: home page featured rooms, `/rent` with a filter sidebar, and `/room/:id` detail pages (description, amenities, owner info, rental conditions).
- Booking: booking modal with invoice flow; users see their bookings under `/my-bookings` with status.
- Landlord: `/landlord` portal — own-room CRUD, dashboard stats (rooms, bookings, earnings), and booking-status management for rooms they own.
- Admin: `/admin` dashboard (stats, users, rooms, bookings; booking status updates, check-in/checkout, room CRUD, image upload, room reassignment to a landlord).
- Account: register/login (httpOnly cookie session + JWT, bcrypt, rate-limited), forgot/reset password (single-use hash-backed tokens), `/about`, `/news` + `/news/:id`.
- Deployment: frontend builds to static files and deploys to GitHub Pages via Actions; backend is an Express + MySQL REST API on port 3000.

## Capabilities and Constraints

- Frontend: React 18 + Vite SPA, react-router-dom (basename set for GitHub Pages), per-page CSS files, Montserrat + Material Symbols + Font Awesome.
- Styling: the app is currently styled with bespoke per-page CSS files (no CSS framework installed). **Bootstrap and Tailwind CSS are permitted** if a future UI task needs them; adding either framework is fine as long as the existing per-page CSS keeps working.
- Backend: Express 5 + MySQL (mysql2 pool), JWT auth, bcryptjs, express-rate-limit, multer uploads (PNG/JPG/WEBP ≤5MB, magic-byte validated) served from `/uploads/`.
- Room fields: title, price (USD/month), address, beds, baths, sqft, badge, description, amenities, owner info, image. News content lives in `frontend/src/data/newsData.js`.
- Database: `database/schema.sql` + `database/migration.sql`. Full feature set confirmed in `frontend/src/App.jsx` and `backend/README.md`; preserve it.

## Brand Commitments

- Product name "Niset Stay" (confirmed to keep).
- Confirmed to keep the existing feature set and the locked stack: React + Vite frontend, Express + MySQL backend, GitHub Pages deployment.

## Evidence on Hand

- Working codebase with live routes, components, and backend endpoints (see `backend/README.md` for the API table).
- Real news content in `frontend/src/data/newsData.js`; real room data flows from MySQL through the API.
- Playwright e2e suite at repo root; repo history shows image handling via storage URLs and backend uploads.
- The Story section lists named students with stock avatar images; treat these as presentational, not verified testimonials. Future work must not fabricate listings, testimonials, or usage claims.

## Product Principles

- Student-first: every surface should make a student feel a place that is quiet, safe, and theirs near campus.
- Clarity over decoration: real photos, honest room facts, and transparent pricing win on a housing decision.
- One sanctuary, end to end: discovery through booking through admin management work as a single trusted flow.
- Respect the operator: admins get unambiguous control over listings and booking states.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established.