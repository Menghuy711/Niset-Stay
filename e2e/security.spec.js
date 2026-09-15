import { test, expect } from '@playwright/test';

// Negative-path / security coverage:
//   - failed login stays on /signin
//   - unauthenticated booking is blocked
//   - non-image upload is rejected
//   - students cannot reach admin or landlord endpoints
//   - a room with an active booking cannot be deleted (this is the crash
//     / history-loss guard from the audit)

const API = 'http://localhost:3000';

async function apiLogin(request, email, password) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  const body = await res.json();
  return body.access_token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('failed login shows an error and stays on the signin page', async ({ page }) => {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill('student01@test.com');
  await page.locator('#loginPassword').fill('definitely-wrong');
  await page.locator('#loginForm button[type="submit"]').click();

  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
});

test('unauthenticated visitor sees Book Now and is redirected to sign-in', async ({ page }) => {
  const roomsRes = await page.request.get(`${API}/api/rooms`);
  const rooms = await roomsRes.json();
  expect(rooms.length).toBeGreaterThan(0);
  const room = rooms[0];

  await page.goto(`/Niset-Stay/room/${room.id}`);
  const bookBtn = page.getByRole('button', { name: /Book Now/ });
  await expect(bookBtn).toHaveCount(1);

  await bookBtn.click();
  await expect(page).toHaveURL(/\/signin/);
});

test('admin API rejects a student token (403)', async ({ request }) => {
  const token = await apiLogin(request, 'student01@test.com', 'password123');
  const res = await request.get(`${API}/api/admin/stats`, { headers: auth(token) });
  expect(res.status()).toBe(403);

  const bookingsRes = await request.get(`${API}/api/landlord/bookings`, { headers: auth(token) });
  expect(bookingsRes.status()).toBe(403);
});

test('non-image upload is rejected (400)', async ({ request }) => {
  const token = await apiLogin(request, 'superadmin@nisetstay.com', 'superadmin123');
  const res = await request.post(`${API}/api/uploads`, {
    headers: auth(token),
    multipart: {
      file: {
        name: 'fake.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('this is not an image'),
      },
    },
  });
  expect(res.status()).toBe(400);
});

test('a landlord cannot create a booking (403)', async ({ request }) => {
  const landlordToken = await apiLogin(request, 'landlord@test.com', 'landlord123');

  // Create a throwaway listing and attempt to book it as the same landlord.
  const createRes = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(landlordToken),
    data: { title: 'Landlord-booking e2e room', price: 88, beds: 1, baths: 1 },
  });
  expect(createRes.ok()).toBeTruthy();
  const room = await createRes.json();

  try {
    const bookingRes = await request.post(`${API}/api/bookings`, {
      headers: auth(landlordToken),
      data: {
        room_id: room.id,
        full_name: 'Landlord Booker',
        phone: '0123456789',
        occupants: 1,
        move_in: '2026-12-01',
      },
    });
    expect(bookingRes.status()).toBe(403);
    expect((await bookingRes.json()).detail).toMatch(/Only students/i);
  } finally {
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(landlordToken) });
  }
});

test('deleting a room with an active booking is rejected', async ({ request }) => {
  const landlordToken = await apiLogin(request, 'landlord@test.com', 'landlord123');
  const studentToken = await apiLogin(request, 'student01@test.com', 'password123');

  // Create a throwaway listing owned by the landlord.
  const createRes = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(landlordToken),
    data: { title: 'Delete-guard e2e room', price: 99, beds: 1, baths: 1 },
  });
  expect(createRes.ok()).toBeTruthy();
  const room = await createRes.json();

  try {
    // Place a pending booking against it.
    const bookingRes = await request.post(`${API}/api/bookings`, {
      headers: auth(studentToken),
      data: {
        room_id: room.id,
        full_name: 'Delete Guard',
        phone: '0123456789',
        occupants: 1,
        move_in: '2026-12-01',
      },
    });
    expect(bookingRes.ok()).toBeTruthy();

    // Owner delete must be blocked while a booking is pending/confirmed.
    const delRes = await request.delete(`${API}/api/landlord/rooms/${room.id}`, {
      headers: auth(landlordToken),
    });
    expect(delRes.status()).toBe(400);

    // Cancel and clean up so we leave no junk behind.
    const bookings = await (await request.get(`${API}/api/landlord/bookings`, { headers: auth(landlordToken) })).json();
    const mine = bookings.find((b) => b.room_id === room.id);
    await request.patch(`${API}/api/landlord/bookings/${mine.id}`, {
      headers: auth(landlordToken),
      data: { status: 'cancelled' },
    });
  } finally {
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, { headers: auth(landlordToken) });
  }
});
