import { test, expect } from '@playwright/test';

// Verification suite for the seven role-system improvements:
//   Bonus  - users.role is an ENUM (register can never inject a foreign role)
//   Fix 1  - admin booking-status changes are written to the audit log
//   Fix 2  - booking status transitions are validated (no illegal moves)
//   Fix 3  - the user list is super-admin only
//   Fix 4  - the last active super_admin cannot be demoted or deactivated
//   Fix 5  - landlords can publish listings immediately (no approval step)
//   Fix 6  - duplicate active bookings on the same room are blocked
//
// Each test is self-contained: it creates its own throwaway listing and cleans
// it up afterwards, so the suite is safe to run in parallel and repeatedly.

const API = 'http://localhost:3000';

async function apiLogin(request, email, password) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.access_token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const SUPER = ['superadmin@nisetstay.com', 'superadmin123'];
const ADMIN = ['admin@nisetstay.com', 'admin123'];
const LANDLORD = ['landlord@test.com', 'landlord123'];
const STUDENT = ['student01@test.com', 'password123'];

async function createRoom(request, landlordToken, title) {
  const res = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(landlordToken),
    data: { title, price: 150, beds: 1, baths: 1 },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function bookRoom(request, studentToken, roomId, fullName) {
  return request.post(`${API}/api/bookings`, {
    headers: auth(studentToken),
    data: {
      room_id: roomId,
      full_name: fullName,
      phone: '012 345 678',
      occupants: 1,
      move_in: '2026-12-01',
    },
  });
}

test('Bonus · role ENUM: registering with an unknown role is rejected (400)', async ({ request }) => {
  const res = await request.post(`${API}/api/auth/register`, {
    data: {
      email: `enum-probe-${Date.now()}@test.com`,
      password: 'password123',
      full_name: 'Enum Probe',
      role: 'hacker',
    },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).detail).toMatch(/student or a landlord/i);
});

test('Fix 1 · admin booking status changes are recorded in the audit log', async ({ request }) => {
  const landlordToken = await apiLogin(request, LANDLORD[0], LANDLORD[1]);
  const studentToken = await apiLogin(request, STUDENT[0], STUDENT[1]);
  const adminToken = await apiLogin(request, ADMIN[0], ADMIN[1]);
  const superToken = await apiLogin(request, SUPER[0], SUPER[1]);

  const room = await createRoom(request, landlordToken, 'Audit e2e room');
  let booking, bookingId;

  try {
    booking = await bookRoom(request, studentToken, room.id, 'Audit Student');
    expect(booking.ok()).toBeTruthy();
    bookingId = (await booking.json()).id;

    const confirm = await request.patch(`${API}/api/admin/bookings/${bookingId}`, {
      headers: auth(adminToken),
      data: { status: 'confirmed' },
    });
    expect(confirm.ok()).toBeTruthy();

    const logsRes = await request.get(`${API}/api/admin/audit-logs`, { headers: auth(superToken) });
    expect(logsRes.ok()).toBeTruthy();
    const logs = await logsRes.json();
    const entry = logs.find(
      (l) => l.target_table === 'bookings' && l.target_id === bookingId && l.action === 'booking.status_changed'
    );
    expect(entry).toBeTruthy();
    expect(entry.actor_role).toBe('admin');
    expect(entry.detail?.to).toBe('confirmed');
  } finally {
    if (bookingId) {
      await request.patch(`${API}/api/admin/bookings/${bookingId}`, {
        headers: auth(adminToken),
        data: { status: 'cancelled' },
      });
    }
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(landlordToken) });
  }
});

test('Fix 2 · invalid booking status transitions are rejected (400)', async ({ request }) => {
  const landlordToken = await apiLogin(request, LANDLORD[0], LANDLORD[1]);
  const studentToken = await apiLogin(request, STUDENT[0], STUDENT[1]);

  const room = await createRoom(request, landlordToken, 'Transition e2e room');
  let bookingId;

  try {
    bookingId = (await (await bookRoom(request, studentToken, room.id, 'Transition Tester')).json()).id;

    const confirm = await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
      headers: auth(landlordToken),
      data: { status: 'confirmed' },
    });
    expect(confirm.ok()).toBeTruthy();

    const backToPending = await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
      headers: auth(landlordToken),
      data: { status: 'pending' },
    });
    expect(backToPending.status()).toBe(400);
    expect(await backToPending.text()).toMatch(/Cannot move booking/i);

    const cancel = await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
      headers: auth(landlordToken),
      data: { status: 'cancelled' },
    });
    expect(cancel.ok()).toBeTruthy();

    const reinstate = await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
      headers: auth(landlordToken),
      data: { status: 'confirmed' },
    });
    expect(reinstate.status()).toBe(400);
    expect(await reinstate.text()).toMatch(/booking is final/i);
  } finally {
    if (bookingId) {
      await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
        headers: auth(landlordToken),
        data: { status: 'cancelled' },
      });
    }
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(landlordToken) });
  }
});

test('Fix 3 · user list: admin sees students/landlords, super admin sees every role', async ({ request }) => {
  const adminToken = await apiLogin(request, ADMIN[0], ADMIN[1]);
  const superToken = await apiLogin(request, SUPER[0], SUPER[1]);

  // A plain admin may list users, but only the normal roles.
  const adminList = await request.get(`${API}/api/admin/users`, { headers: auth(adminToken) });
  expect(adminList.status()).toBe(200);
  const scoped = await adminList.json();
  expect(Array.isArray(scoped)).toBeTruthy();
  expect(scoped.length).toBeGreaterThan(0);
  for (const u of scoped) {
    expect(['student', 'landlord']).toContain(u.role);
  }

  const allowed = await request.get(`${API}/api/admin/users`, { headers: auth(superToken) });
  expect(allowed.ok()).toBeTruthy();
  const users = await allowed.json();
  expect(Array.isArray(users)).toBeTruthy();
  expect(users.map((u) => u.role)).toContain('super_admin');
});

test('Fix 7 · an admin can manage students but not staff or staff roles', async ({ request }) => {
  const adminToken = await apiLogin(request, ADMIN[0], ADMIN[1]);
  const superToken = await apiLogin(request, SUPER[0], SUPER[1]);

  // Admin can list (and act on) a student…
  const list = await (await request.get(`${API}/api/users`, { headers: auth(adminToken) })).json();
  const student = list.find((u) => u.role === 'student');
  expect(student).toBeTruthy();

  try {
    const deactivate = await request.patch(`${API}/api/users/${student.id}`, {
      headers: auth(adminToken),
      data: { is_active: false },
    });
    expect(deactivate.status()).toBe(200);
    expect((await deactivate.json()).is_active).toBe(0);

    // …but cannot promote a user to a staff role:
    const promote = await request.patch(`${API}/api/users/${student.id}`, {
      headers: auth(adminToken),
      data: { role: 'admin' },
    });
    expect(promote.status()).toBe(403);
  } finally {
    await request.patch(`${API}/api/users/${student.id}`, {
      headers: auth(adminToken),
      data: { is_active: true },
    });
  }

  // …and cannot touch another admin:
  const staffList = await (await request.get(`${API}/api/users`, { headers: auth(superToken) })).json();
  const anyAdmin = staffList.find((u) => u.role === 'admin');
  const touchAdmin = await request.patch(`${API}/api/users/${anyAdmin.id}`, {
    headers: auth(adminToken),
    data: { is_active: false },
  });
  expect(touchAdmin.status()).toBe(403);
});

test('Fix 4 · the last active super_admin cannot be demoted or deactivated', async ({ request }) => {
  const superToken = await apiLogin(request, SUPER[0], SUPER[1]);
  const me = await (await request.get(`${API}/api/auth/me`, { headers: auth(superToken) })).json();

  const demote = await request.patch(`${API}/api/users/${me.id}`, {
    headers: auth(superToken),
    data: { role: 'student' },
  });
  expect(demote.status()).toBe(400);

  const deactivate = await request.patch(`${API}/api/users/${me.id}`, {
    headers: auth(superToken),
    data: { is_active: false },
  });
  expect(deactivate.status()).toBe(400);

  const after = await (await request.get(`${API}/api/auth/me`, { headers: auth(superToken) })).json();
  expect(after.role).toBe('super_admin');
  expect(after.is_active).toBe(1);
});

test('Fix 5 · a freshly registered landlord can create a listing with no approval', async ({ request }) => {
  const email = `instant-landlord-${Date.now()}@test.com`;

  const reg = await request.post(`${API}/api/auth/register`, {
    data: { email, password: 'password123', full_name: 'Instant Landlord', role: 'landlord' },
  });
  expect(reg.status()).toBe(201);
  expect((await reg.json()).role).toBe('landlord');

  const token = await apiLogin(request, email, 'password123');
  const roomRes = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(token),
    data: { title: `Live instantly ${Date.now()}`, price: 90, beds: 1, baths: 1 },
  });
  expect(roomRes.status()).toBe(201);
  const room = await roomRes.json();
  await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(token) });
});

test('Fix 6 · the same room cannot be booked twice while a booking is active', async ({ request }) => {
  const landlordToken = await apiLogin(request, LANDLORD[0], LANDLORD[1]);
  const studentToken = await apiLogin(request, STUDENT[0], STUDENT[1]);

  const room = await createRoom(request, landlordToken, 'Duplicate e2e room');
  let bookingId;

  try {
    const first = await bookRoom(request, studentToken, room.id, 'Duplicate Tester');
    expect(first.status()).toBe(201);
    bookingId = (await first.json()).id;

    const second = await bookRoom(request, studentToken, room.id, 'Duplicate Tester');
    expect(second.status()).toBe(400);
    expect(await second.text()).toMatch(/already have an active booking/i);
  } finally {
    if (bookingId) {
      await request.patch(`${API}/api/landlord/bookings/${bookingId}`, {
        headers: auth(landlordToken),
        data: { status: 'cancelled' },
      });
    }
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(landlordToken) });
  }
});