import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Admin/super_admin are management-only: after login they land straight in the
// admin panel (not the public home page), and no public nav links are shown.

test('super admin goes straight to the admin panel after login', async ({ page }) => {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill('superadmin@nisetstay.com');
  await page.locator('#loginPassword').fill('superadmin123');
  await page.locator('#loginForm button[type="submit"]').click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('.admin-badge')).toHaveText('Super Admin Panel');
  await expect(page.locator('.admin-user-role')).toContainText('Super Admin');

  // No public Home / Profile links in the header pill (not a public page).
  await expect(page.getByRole('link', { name: 'Home' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Profile' })).toHaveCount(0);
});

test('super admin can open the Manage Users tab and list accounts', async ({ page }) => {
  await page.goto('/Niset-Stay/signin');
  await page.locator('#loginEmail').fill('superadmin@nisetstay.com');
  await page.locator('#loginPassword').fill('superadmin123');
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/);

  await page.getByRole('button', { name: /Manage Users/ }).click();

  await expect(page.getByText('test3@example.com')).toBeVisible();
  await expect(page.getByText('landlord@test.com')).toBeVisible();

  // Role selects render; the super admin's own row is locked
  const adminRow = page.locator('tr', { hasText: 'superadmin@nisetstay.com' }).first();
  await expect(adminRow.locator('.admin-role-select')).toBeDisabled();

  const test3Row = page.locator('tr', { hasText: 'test3@example.com' }).first();
  await expect(test3Row.locator('.admin-role-select')).toBeEnabled();
});