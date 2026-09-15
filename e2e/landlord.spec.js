import { test, expect } from '@playwright/test';

// NOTE: serial mode — if a test fails, the remaining tests in this file are skipped.
// The "student cannot open the landlord portal" test only ever reports "did not run"
// if an earlier test in this file failed; it is not itself flaky.
test.describe.configure({ mode: 'serial' });
const LANDLORD_EMAIL = 'landlord@test.com';
const LANDLORD_PASSWORD = 'landlord123';
const STUDENT_EMAIL = 'student01@test.com';
const STUDENT_PASSWORD = 'password123';

async function loginAs(page, email, password) {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
}

async function apiLogin(request, email, password) {
  const res = await request.post('http://localhost:3000/api/auth/login', { data: { email, password } });
  const body = await res.json();
  return body.access_token;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

test('register shows role picker and toggles landlord', async ({ page }) => {
  await page.goto('/Niset-Stay/signin');
  await page.getByRole('tab', { name: 'Register' }).click();

  const picker = page.locator('.auth-role-picker');
  await expect(picker).toBeVisible();
  await expect(page.getByRole('radio', { name: /Student/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Landlord/ })).toBeVisible();

  await page.getByRole('radio', { name: /Landlord/ }).click();
  await expect(page.getByRole('radio', { name: /Landlord/ })).toHaveAttribute('aria-checked', 'true');
});

test('landlord signs in and sees the portal in the header', async ({ page }) => {
  await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Landlord Portal')).toBeVisible();
  await expect(page.locator('.header-user-pill')).toContainText('Landlord');
});

test('landlord portal shows the dashboard and the add-listing modal', async ({ page }) => {
  await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('link', { name: 'Landlord Portal' }).first().click();
  await expect(page).toHaveURL(/\/landlord/);

  // Dashboard is the default tab: metric cards and the income panel render.
  await expect(page.getByText('Total Rooms', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Occupancy Rate', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Monthly Income')).toBeVisible();

  // Room fixture lives on the Listings tab.
  await page.getByRole('tab', { name: 'Listings' }).click();
  await expect(page.getByText('Landlord Studio near RUPP')).toBeVisible();

  await page.getByRole('button', { name: 'Add Room' }).click();
  const modal = page.locator('.admin-room-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Add New Room')).toBeVisible();
  await page.locator('.admin-modal-close').click();
  await expect(modal).toHaveCount(0);
});

test('landlord dashboard reflects newly added floor, student and bill', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);

  // Self-contained fixture so repeated runs never stack up rows: the portal
  // counts are asserted against exactly these records, then everything is
  // torn down in `finally`.
  const floorRes = await request.post('http://localhost:3000/api/landlord/floors', {
    headers: authHeader(landlordToken),
    data: { label: 'E2E Floor' },
  });
  expect(floorRes.ok()).toBeTruthy();
  const floor = await floorRes.json();

  const studentRes = await request.post('http://localhost:3000/api/landlord/students', {
    headers: authHeader(landlordToken),
    data: { full_name: 'E2E Student', phone: '+855 00 000 000' },
  });
  expect(studentRes.ok()).toBeTruthy();
  const student = await studentRes.json();

  let billId;
  try {
    const billRes = await request.post('http://localhost:3000/api/landlord/bills', {
      headers: authHeader(landlordToken),
      data: { student_id: student.id, amount: 150, period: '2026-09', due_date: '2026-10-01' },
    });
    expect(billRes.ok()).toBeTruthy();
    billId = (await billRes.json()).id;

    await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Landlord Portal' }).first().click();

    await expect(page.locator('.ll-metric', { hasText: 'Total Floors' }).locator('.ll-metric-value')).toHaveText('1');

    // Student/pending counts may transiently include rows from other parallel
    // specs, so assert they reflect at least the fixture created above.
    const studentsValue = page.locator('.ll-metric', { hasText: 'Total Students' }).locator('.ll-metric-value');
    await expect.poll(async () => parseInt(await studentsValue.textContent(), 10) || 0).toBeGreaterThanOrEqual(1);
    const pendingValue = page.locator('.ll-metric', { hasText: 'Pending Bills' }).locator('.ll-metric-value');
    await expect.poll(async () => parseInt(await pendingValue.textContent(), 10) || 0).toBeGreaterThanOrEqual(1);

    await expect(page.getByRole('heading', { name: 'Recent Bills' })).toBeVisible();
    await expect(page.getByText('E2E Student')).toBeVisible();
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible();
  } finally {
    if (billId) {
      await request.delete(`http://localhost:3000/api/landlord/bills/${billId}`, {
        headers: authHeader(landlordToken),
      });
    }
    await request.delete(`http://localhost:3000/api/landlord/students/${student.id}`, {
      headers: authHeader(landlordToken),
    });
    await request.delete(`http://localhost:3000/api/landlord/floors/${floor.id}`, {
      headers: authHeader(landlordToken),
    });
  }
});

test('landlord can confirm a pending booking from the portal', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const studentToken = await apiLogin(request, STUDENT_EMAIL, STUDENT_PASSWORD);

  // Self-contained fixture: own a fresh room + booking, then clean both up so
  // repeated runs never stack up rows or accidentally approve leftovers from
  // an earlier run (the queue orders newest first, so .first() is our booking).
  const createRes = await request.post('http://localhost:3000/api/landlord/rooms', {
    headers: authHeader(landlordToken),
    data: { title: 'Confirm-booking e2e room', price: 120, beds: 1, baths: 1 },
  });
  expect(createRes.ok()).toBeTruthy();
  const room = await createRes.json();

  let bookingId;
  try {
    const bookingRes = await request.post('http://localhost:3000/api/bookings', {
      headers: authHeader(studentToken),
      data: {
        room_id: room.id,
        full_name: 'Student One',
        phone: '+855 12 000 000',
        occupants: 1,
        move_in: '2026-11-01',
      },
    });
    expect(bookingRes.ok()).toBeTruthy();
    bookingId = (await bookingRes.json()).id;

    await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Landlord Portal' }).first().click();

    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.getByRole('button', { name: 'Approve' }).first().click();

    await expect(page.locator('.ll-toast')).toContainText('Booking marked as Confirmed');
    await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
  } finally {
    if (bookingId) {
      await request.patch(`http://localhost:3000/api/landlord/bookings/${bookingId}`, {
        headers: authHeader(landlordToken),
        data: { status: 'cancelled' },
      });
    }
    await request.delete(`http://localhost:3000/api/landlord/rooms/${room.id}`, {
      headers: authHeader(landlordToken),
    });
  }
});

test('student cannot open the landlord portal', async ({ page }) => {
  await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Landlord Portal')).toHaveCount(0);
  await expect(page.getByText('My Bookings')).toBeVisible();

  await page.goto('/Niset-Stay/landlord');
  await expect(page).toHaveURL(/\/signin/);
});