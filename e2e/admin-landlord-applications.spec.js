import { test, expect } from '@playwright/test';

// Round-3 coverage (updated for the no-approval flow):
//   - the landlord portal activates immediately on registration: register →
//     publish listings right away, no admin approval step in between
//   - public /api/rooms no longer leaks internal / PII columns

const API = 'http://localhost:3000';

async function apiLogin(request, email, password) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  const body = await res.json();
  return body.access_token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const INTERNAL_ROOM_KEYS = ['owner_user_id', 'student_id', 'status', 'floor_id', 'updated_at'];
const OWNER_CONTACT_KEYS = ['owner_phone', 'owner_email', 'owner_telegram'];

test('a newly registered landlord can publish a listing immediately without admin approval', async ({ request }) => {
  const ts = Date.now();
  const email = `instant-landlord-${ts}@test.com`;

  // Register as a landlord — the portal is usable right away.
  const reg = await request.post(`${API}/api/auth/register`, {
    data: { email, password: 'password123', full_name: `Instant Landlord ${ts}`, role: 'landlord' },
  });
  expect(reg.ok()).toBeTruthy();
  expect((await reg.json()).role).toBe('landlord');

  let roomId;
  let landlordToken;
  try {
    // No admin review: creating a listing succeeds immediately.
    landlordToken = await apiLogin(request, email, 'password123');
    const create = await request.post(`${API}/api/landlord/rooms`, {
      headers: auth(landlordToken),
      data: { title: `Live instantly ${ts}`, price: 120, beds: 1, baths: 1 },
    });
    expect(create.ok()).toBeTruthy();
    roomId = (await create.json()).id;

    // The listing is immediately visible to students.
    const publicRes = await request.get(`${API}/api/rooms`);
    const publicRooms = await publicRes.json();
    expect(publicRooms.some((r) => r.id === roomId)).toBe(true);
  } finally {
    if (roomId) {
      await request.delete(`${API}/api/landlord/rooms/${roomId}`, { headers: auth(landlordToken) });
    }
  }
});

test('public /api/rooms does not leak internal or owner PII columns', async ({ request }) => {
  const list = await (await request.get(`${API}/api/rooms`)).json();
  expect(list.length).toBeGreaterThan(0);

  for (const room of [...list.slice(0, 3)]) {
    for (const key of [...INTERNAL_ROOM_KEYS, ...OWNER_CONTACT_KEYS]) {
      expect(room).not.toHaveProperty(key);
    }
  }

  // Detail view keeps owner contact (needed to reach the landlord) but still
  // excludes internal ownership/assignment columns.
  const detail = await (await request.get(`${API}/api/rooms/${list[0].id}`)).json();
  for (const key of INTERNAL_ROOM_KEYS) {
    expect(detail).not.toHaveProperty(key);
  }
  expect(detail.owner_phone).toBeDefined();
});