import { test, expect } from '@playwright/test';

// Round-2 coverage gaps:
//   - unknown route renders the NotFound page
//   - /news/:id with an invalid ID shows the not-found UI
//   - /news?cat= filters news cards; detail-category link deep-links back
//   - /rent search filter updates URL, shows no-results, clears correctly
//   - /rent sort select syncs to URL
//   - BookingModal UI flow end-to-end (create → fill → submit → success)

const API = 'http://localhost:3000';

async function apiLogin(request, email, password) {
  const res = await request.post(`${API}/api/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  return body.access_token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// 404 route
// ---------------------------------------------------------------------------

test('unknown route shows the NotFound page', async ({ page }) => {
  await page.goto('/Niset-Stay/this-page-does-not-exist');
  await expect(page.locator('main h1')).toHaveText('404');
  await expect(page.getByText(/doesn't exist|has been moved/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/Niset-Stay/');
});

// ---------------------------------------------------------------------------
// News: invalid ID
// ---------------------------------------------------------------------------

test('/news/:id with an invalid ID shows a not-found message', async ({ page }) => {
  await page.goto('/Niset-Stay/news/99999');
  await expect(page.locator('.nd-status')).toContainText('Story not found');
});

// ---------------------------------------------------------------------------
// News: category filter via URL param + detail deep-link
// ---------------------------------------------------------------------------

test('/news?cat= filters cards and the All tab clears the URL', async ({ page }) => {
  await page.goto('/Niset-Stay/news?cat=scholarship');
  await expect(page.locator('.news-grid .news-card').first()).toBeVisible();

  // Every visible card badge shows the selected category.
  const cats = page.locator('.news-grid .news-card .news-category');
  const count = await cats.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(cats.nth(i)).toContainText('Scholarship');
  }
  await expect(page).toHaveURL(/[?&]cat=scholarship/);

  // Click "All" — cards return and the cat param is dropped.
  await page.getByRole('tab', { name: /^All/i }).click();
  await expect(page).not.toHaveURL(/[?&]cat=/);
  await expect(page.locator('.news-grid .news-card').first()).toBeVisible();
});

test('news detail category link deep-links to the filtered list', async ({ page }) => {
  await page.goto('/Niset-Stay/news');
  await page.locator('.news-grid .news-card .news-read-more').first().click();
  await expect(page).toHaveURL(/\/news\/\d+/);

  // First sidebar category "Scholarship" deep-links to /news?cat=scholarship.
  await page.locator('.nd-category-link').first().click();
  await expect(page).toHaveURL(/[?&]cat=scholarship/);
  await expect(page.locator('.news-grid .news-card').first()).toBeVisible();
  await expect(page.locator('.news-grid .news-category').first()).toContainText('Scholarship');
});

// ---------------------------------------------------------------------------
// Rent: search filter, URL sync, no-results, clear
// ---------------------------------------------------------------------------

test('/rent search filter updates URL, shows no-results, and clears', async ({ page }) => {
  await page.goto('/Niset-Stay/rent');
  await expect(page.locator('.property-list .card').first()).toBeVisible();

  // Fill search with a term that should match nothing.
  const searchInput = page.locator('#search-input');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('zzz_nonexistent_room_xxyyz');

  // URL gains the q parameter.
  await expect(page).toHaveURL(/[?&]q=zzz/);

  // No-results message appears.
  await expect(page.locator('.no-results')).toBeVisible();
  await expect(page.locator('.no-results')).toContainText('No rooms match your filters');

  // Clear the search — results reappear and q is removed.
  await searchInput.fill('');
  await expect(page.locator('.property-list .card').first()).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]q=/);
});

// ---------------------------------------------------------------------------
// Rent: sort param syncs to URL
// ---------------------------------------------------------------------------

test('/rent sort select syncs sort param to URL', async ({ page }) => {
  await page.goto('/Niset-Stay/rent');
  await expect(page.locator('.property-list .card').first()).toBeVisible();

  await page.locator('#sort-select').selectOption('price_asc');
  await expect(page).toHaveURL(/[?&]sort=price_asc/);

  await page.locator('#sort-select').selectOption('price_desc');
  await expect(page).toHaveURL(/[?&]sort=price_desc/);
});

// ---------------------------------------------------------------------------
// BookingModal UI flow
// ---------------------------------------------------------------------------

test('BookingModal: full booking flow renders success and lands on My Bookings', async ({
  page,
  request,
}) => {
  // ---- Setup: landlord creates a room, student registers + logs in ----
  const landlordToken = await apiLogin(request, 'landlord@test.com', 'landlord123');
  const ts = Date.now();
  const studentEmail = `ui-book-${ts}@test.com`;
  const studentPassword = 'password123';

  // Register student.
  const regRes = await request.post(`${API}/api/auth/register`, {
    data: { email: studentEmail, password: studentPassword, full_name: `UI Booker ${ts}` },
  });
  expect(regRes.ok()).toBeTruthy();

  // Landlord creates a throwaway room.
  const roomRes = await request.post(`${API}/api/landlord/rooms`, {
    headers: auth(landlordToken),
    data: { title: `BookingModal e2e ${ts}`, price: 77, beds: 1, baths: 1 },
  });
  expect(roomRes.ok()).toBeTruthy();
  const room = await roomRes.json();

  try {
    // ---- Login as student via UI ----
    await page.goto('/Niset-Stay/signin');
    await page.locator('#loginEmail').fill(studentEmail);
    await page.locator('#loginPassword').fill(studentPassword);
    await page.locator('#loginForm button[type="submit"]').click();
    // Wait until the header shows the logged-in user pill.
    await expect(page.locator('.header-user-pill')).toBeVisible({ timeout: 10000 });

    // ---- Open room detail and click Book Now ----
    await page.goto(`/Niset-Stay/room/${room.id}`);
    const bookBtn = page.getByRole('button', { name: /Book Now/i });
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();

    // ---- Fill and submit the booking form ----
    // (The page also hosts an image lightbox role="dialog", so target by name.)
    const dialog = page.getByRole('dialog', { name: 'Reserve Your Stay' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.bm-form')).toBeVisible();

    // Full name should be prefilled from the registered name.
    const nameInput = dialog.locator('input[placeholder="Enter your full name"]');
    await expect(nameInput).toHaveValue(new RegExp(ts));

    await dialog.locator('input[placeholder*="012"]').fill('012 345 678');
    await dialog.locator('.bm-submit-btn').click();

    // ---- Assert success ----
    await expect(dialog.locator('.bm-success-box')).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('.bm-success-title')).toContainText('Booking Submitted!');

    // ---- Navigate to My Bookings ----
    await dialog.locator('.bm-submit-btn').click(); // "View My Bookings"
    await expect(page).toHaveURL(/\/my-bookings/);
  } finally {
    // ---- Cleanup: cancel booking + delete room ----
    const bookingsRes = await request.get(`${API}/api/landlord/bookings`, {
      headers: auth(landlordToken),
    });
    const bookings = await bookingsRes.json();
    const booking = bookings.find((b) => b.room_id === room.id);
    if (booking) {
      await request.patch(`${API}/api/landlord/bookings/${booking.id}`, {
        headers: auth(landlordToken),
        data: { status: 'cancelled' },
      });
    }
    await request.delete(`${API}/api/landlord/rooms/${room.id}`, {
      headers: auth(landlordToken),
    });
  }
});