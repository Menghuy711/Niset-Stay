// @ts-check
const { test, expect } = require('@playwright/test');

test('home page loads with hero content', async ({ page }) => {
  await page.goto('/Niset-Stay/');
  await expect(page).toHaveTitle(/Student Housing in Phnom Penh/);
  await expect(page.getByRole('heading', { name: /More than a room/ })).toBeVisible();
});

test('navigation bar links to the sign in page', async ({ page }) => {
  await page.goto('/Niset-Stay/');
  await page.getByRole('link', { name: /sign ?in/i }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});