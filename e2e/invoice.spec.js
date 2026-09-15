import { test, expect } from '@playwright/test';

// Invoice coverage: a student with a booking can open the rendered invoice and
// its amounts are computed from the booking's stored price and deposit terms.
// The fixture (room + booking) is created and torn down within the test so
// repeated runs leave no state behind.

const API = 'http://localhost:3000';
const LANDLORD_EMAIL = 'landlord@test.com';
const LANDLORD_PASSWORD = 'landlord123';
const STUDENT_EMAIL = 'student01@test.com';
const STUDENT_PASSWORD = 'password123';

async function apiLogin(request, email, password) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function loginAs(page, email, password) {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

test('student sees a rendered invoice for their booking', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const studentToken = await apiLogin(request, STUDENT_EMAIL, STUDENT_PASSWORD);

  // $120/month room with a one-month deposit => computable invoice amounts.
  const roomRes = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(landlordToken),
    data: {
      title: 'Invoice e2e room',
      price: 120,
      beds: 1,
      baths: 1,
      contract_terms: 'Minimum 6-month contract.',
      deposit_terms: 'One month deposit required.',
      utilities_terms: 'Electricity and water billed separately.',
    },
  });
  expect(roomRes.ok()).toBeTruthy();
  const room = await roomRes.json();

  let bookingId;
  try {
    const bookingRes = await request.post(`${API}/api/bookings`, {
      headers: auth(studentToken),
      data: {
        room_id: room.id,
        full_name: 'Invoice Student',
        phone: '+855 70 000 000',
        occupants: 1,
        move_in: '2026-12-01',
      },
    });
    expect(bookingRes.ok()).toBeTruthy();
    bookingId = (await bookingRes.json()).id;

    await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    await page.goto('/Niset-Stay/my-bookings');

    const card = page.locator('.mb-card', { hasText: 'Invoice e2e room' });
    await expect(card.first()).toBeVisible();
    await card.first().getByRole('button', { name: /View Invoice/i }).click();

    const modal = page.locator('.mb-invoice-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Booking Invoice & Receipt');
    await expect(modal.locator('.mb-inv-number')).toContainText('INV-');
    await expect(modal).toContainText('Invoice e2e room');
    await expect(modal).toContainText('$120.00');   // first-month rent
    await expect(modal).toContainText('$240.00');   // rent + one-month deposit
    await expect(modal).toContainText('Pending Review');
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