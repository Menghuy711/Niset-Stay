import { badRequest } from './middleware/auth.js';

export const ROOM_COLUMNS = [
  'title', 'address', 'price', 'beds', 'baths', 'sqft', 'image_url', 'badge',
  'description', 'ref_id', 'thumb_images', 'map_query', 'latitude', 'longitude', 'amenities',
  'owner_name', 'owner_phone', 'owner_email', 'owner_telegram',
  'contract_terms', 'deposit_terms', 'pet_policy', 'utilities_terms',
  'owner_user_id',
];

// Index of the owner linkage column both for INSERT and for the landlord
// update path. Using this constant (instead of `params.length - 1`) keeps the
// two call sites honest if ROOM_COLUMNS ever changes.
export const ROOM_OWNER_INDEX = ROOM_COLUMNS.indexOf('owner_user_id');

// Columns exposed on the PUBLIC, unauthenticated room routes. Deliberately
// omits internal/ownership columns (owner_user_id, floor_id, status,
// student_id) and the owner's contact details, which should not leak on a
// browsable listing feed.
export const PUBLIC_ROOM_COLUMNS = [
  'id', 'title', 'address', 'price', 'beds', 'baths', 'sqft', 'image_url',
  'badge', 'description', 'latitude', 'longitude', 'created_at',
];

// The public DETAIL view additionally exposes the fields students need to
// decide and contact the owner. Still excludes internal ownership columns.
export const PUBLIC_ROOM_DETAIL_COLUMNS = [
  ...PUBLIC_ROOM_COLUMNS,
  'ref_id', 'thumb_images', 'map_query', 'amenities',
  'owner_name', 'owner_phone', 'owner_email', 'owner_telegram',
  'contract_terms', 'deposit_terms', 'pet_policy', 'utilities_terms',
];

export const JSON_COLUMNS = new Set(['thumb_images', 'amenities']);

const MAX_PRICE = 10_000_000;

/**
 * Coerce + validate the numeric room fields present in a request body, in place.
 * - price: required, finite, non-negative, capped (bad values are 400s, never a
 *   500 from binding "Infinity"/"" into a DECIMAL/NOT NULL column).
 * - beds/baths: positive integers. Empty/invalid optional values are deleted so
 *   create defaults apply and updates leave the column untouched.
 * - sqft: non-negative number with the same deletion rule.
 */
export function normalizeRoomNumbers(body) {
  for (const field of ['price', 'beds', 'baths', 'sqft']) {
    if (!(field in body)) continue;

    if (field === 'price') {
      const value = body[field];
      if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
        throw badRequest('price must be a valid number');
      }
      const price = Number(value);
      if (price < 0 || price > MAX_PRICE) throw badRequest('price is out of range');
      body[field] = Math.round(price * 100) / 100;
      continue;
    }

    const value = body[field];
    if (value === undefined || value === null || value === '') {
      delete body[field];
      continue;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) throw badRequest(`${field} must be a valid number`);
    if (field === 'sqft') {
      if (num < 0) throw badRequest('sqft cannot be negative');
      body[field] = num;
    } else {
      body[field] = Math.trunc(num);
    }
  }

  if (body.beds !== undefined && body.beds < 1) throw badRequest('beds must be at least 1');
  if (body.baths !== undefined && body.baths < 1) throw badRequest('baths must be at least 1');
}

/** Coerce a request value to a finite number, or null when absent/invalid. */
function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Build a room record from a request body, overriding owner linkage if supplied.
 * Returns `{ columns, params }` ready for INSERT, or an update map for PUT.
 */
export function roomRecord(body) {
  const values = {
    title: body.title ?? null,
    address: body.address ?? null,
    price: body.price ?? null,
    beds: body.beds ?? 1,
    baths: body.baths ?? 1,
    sqft: body.sqft ?? 1200,
    image_url: body.image_url ?? 'property-1.jpg',
    badge: body.badge ?? null,
    description: body.description ?? null,
    ref_id: body.ref_id ?? null,
    thumb_images: body.thumb_images ?? null,
    map_query: body.map_query ?? null,
    latitude: toNullableNumber(body.latitude),
    longitude: toNullableNumber(body.longitude),
    amenities: body.amenities ?? null,
    owner_name: body.owner_name ?? null,
    owner_phone: body.owner_phone ?? null,
    owner_email: body.owner_email ?? null,
    owner_telegram: body.owner_telegram ?? null,
    contract_terms: body.contract_terms ?? null,
    deposit_terms: body.deposit_terms ?? null,
    pet_policy: body.pet_policy ?? null,
    utilities_terms: body.utilities_terms ?? null,
    owner_user_id: body.owner_user_id ?? null,
  };

  const columns = [...ROOM_COLUMNS];
  const params = columns.map((c) =>
    JSON_COLUMNS.has(c) && values[c] !== null ? JSON.stringify(values[c]) : values[c]
  );
  return { columns, params };
}

/** Diff a body against ROOM_COLUMNS to build a SET clause. Returns updated row id query pieces. */
export function roomUpdate(body, extraFields = {}) {
  const sets = [];
  const params = [];
  for (const col of ROOM_COLUMNS) {
    if (col === 'owner_user_id') continue;
    if (!(col in body)) continue;
    const value = JSON_COLUMNS.has(col) && body[col] !== null ? JSON.stringify(body[col]) : body[col];
    sets.push(`${col} = ?`);
    params.push(value);
  }
  for (const [col, value] of Object.entries(extraFields)) {
    sets.push(`${col} = ?`);
    params.push(value);
  }
  return { sets, params };
}