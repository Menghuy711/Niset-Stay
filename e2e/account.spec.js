import { test, expect } from '@playwright/test';

// Profile / account coverage:
//   - /profile is guarded (guest redirected to signin)
//   - profile name edit persists and shows in the header, then is restored
//   - password change with mismatched confirmation is blocked client-side
//   - password change works end-to-end (old password dies, new password signs
//     in), then the account is restored
//   - reset tokens are single-use (dev flow; skipped if DEBUG is off)

// NOTE: serial mode — these tests temporarily mutate the shared test3 account
// (name, password), so they must never run concurrently with each other.
test.describe.configure({ mode: 'serial' });

const API = 'http://localhost:3000';
const EMAIL = 'test3@example.com';
const PASSWORD = 'password123';

async function apiLogin(request, email = EMAIL, password = PASSWORD) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function loginAs(page, email = EMAIL, password = PASSWORD) {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

const securityCard = (page) => page.locator('section[aria-labelledby="pf-security-title"]');

test('guest is redirected to signin from the profile page', async ({ page }) => {
  await page.goto('/Niset-Stay/profile');
  await expect(page).toHaveURL(/\/signin/);
});

test('student updates their profile name and sees it in the header', async ({ page, request }) => {
  const token = await apiLogin(request);
  const me = await (await request.get(`${API}/api/auth/me`, { headers: auth(token) })).json();
  const originalName = me.full_name;
  const originalPhone = me.phone;
  const newName = `Student ${Date.now().toString(36)}`;

  try {
    await loginAs(page);
    await page.goto('/Niset-Stay/profile');
    await expect(page.locator('#pfName')).toBeVisible();
    await page.locator('#pfName').fill(newName);
    await page.locator('#pfPhone').fill('+855 10 000 999');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.pf-success')).toContainText('Profile updated successfully.');
    await expect(page.locator('.pf-profile-name')).toHaveText(newName);
    await expect(page.locator('.header-user-pill')).toContainText(newName);
  } finally {
    await request.patch(`${API}/api/users/me`, {
      headers: auth(token),
      data: { full_name: originalName, phone: originalPhone },
    });
  }
});

test('password change with mismatched confirmation is blocked client-side', async ({ page }) => {
  await loginAs(page);
  await page.goto('/Niset-Stay/profile');
  await page.locator('#pfCurrentPw').fill(PASSWORD);
  await page.locator('#pfNewPw').fill('brand-new-pass1');
  await page.locator('#pfConfirmPw').fill('different-pass2');
  await securityCard(page).getByRole('button', { name: 'Update Password' }).click();

  await expect(securityCard(page).locator('.pf-error')).toContainText('New passwords do not match.');
});

test('student can change their password and sign back in with the new one', async ({ page, request }) => {
  const token = await apiLogin(request);
  const tempPassword = 'temp-new-pass1';

  try {
    const change = await request.post(`${API}/api/auth/change-password`, {
      headers: auth(token),
      data: { current_password: PASSWORD, new_password: tempPassword },
    });
    expect(change.ok()).toBeTruthy();

    // The old password must be dead.
    const oldLogin = await request.post(`${API}/api/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(oldLogin.status()).toBe(401);

    // The new password signs in fine.
    await loginAs(page, EMAIL, tempPassword);
    await expect(page.getByText('My Bookings')).toBeVisible();
  } finally {
    // Restore password123 so every other suite keeps working.
    const res = await request.post(`${API}/api/auth/login`, { data: { email: EMAIL, password: tempPassword } });
    if (res.ok()) {
      await request.post(`${API}/api/auth/change-password`, {
        headers: auth((await res.json()).access_token),
        data: { current_password: tempPassword, new_password: PASSWORD },
      });
    }
  }
});

test('password reset tokens are single-use', async ({ request }) => {
  // Dev-only: the raw reset token is only echoed when DEBUG is enabled.
  const forgot = await request.post(`${API}/api/auth/forgot-password`, { data: { email: EMAIL } });
  expect(forgot.ok()).toBeTruthy();
  const body = await forgot.json();
  test.skip(!body.reset_token, 'reset tokens are only echoed when DEBUG is enabled');

  const resetPassword = 'reset-pass-1';
  const first = await request.post(`${API}/api/auth/reset-password`, {
    data: { token: body.reset_token, new_password: resetPassword },
  });
  expect(first.ok()).toBeTruthy();

  // Replaying the same token must be rejected.
  const replay = await request.post(`${API}/api/auth/reset-password`, {
    data: { token: body.reset_token, new_password: 'another-pass-2' },
  });
  expect(replay.status()).toBe(400);

  // Restore the seed password so other suites can keep using it.
  const next = await request.post(`${API}/api/auth/forgot-password`, { data: { email: EMAIL } });
  const nextBody = await next.json();
  expect(nextBody.reset_token).toBeTruthy();
  const restore = await request.post(`${API}/api/auth/reset-password`, {
    data: { token: nextBody.reset_token, new_password: PASSWORD },
  });
  expect(restore.ok()).toBeTruthy();
});