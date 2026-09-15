import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// NOTE: serial mode — the management-fees flow assumes a clean add-on state and
// creates + tears down its own fixtures so repeated runs never stack rows.
test.describe.configure({ mode: 'serial' });

const LANDLORD_EMAIL = 'landlord@test.com';
const LANDLORD_PASSWORD = 'landlord123';

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

function readDbEnv() {
  const envPath = path.resolve(process.cwd(), 'backend/.env');
  if (!fs.existsSync(envPath)) return { user: 'root', pass: '', db: 'niset_stay' };
  const parsed = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) parsed[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { user: parsed.DB_USER || 'root', pass: parsed.DB_PASSWORD || '', db: parsed.DB_NAME || 'niset_stay' };
}

// Paid invoices cannot be deleted through the API (by design), so teardown
// clears the exact rows this suite created directly against the dev database.
function cleanupFeeRows(feeIds) {
  if (!feeIds.length) return;
  const { user, pass, db } = readDbEnv();
  try {
    execFileSync('mysql', [ '-u', user, ...(pass ? [`-p${pass}`] : []), db, '-e', `DELETE FROM management_fees WHERE id IN (${feeIds.join(',')});` ], { stdio: 'ignore' });
  } catch {
    /* best-effort teardown */
  }
}

async function openMgmtFeesTab(page) {
  await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Landlord Portal' }).first().click();
  await expect(page).toHaveURL(/\/landlord/);
  await page.getByRole('tab', { name: 'Mgmt Fees' }).click();
}

// Aborted runs can leave dead "E2E Fee Room"/"E2E Fee Owner" fixtures behind, and
// paid invoices can't be deleted through the API (by design), so purge leftovers
// before each run so strict text locators never resolve to stale duplicates.
async function purgeDeadFeeFixtures(request, headers) {
  // Orphaned invoices (room_id = NULL) from aborted runs can't be reached by
  // room, so wipe every fixture row by owner name first.
  const { user, pass, db } = readDbEnv();
  try {
    execFileSync('mysql', [ '-u', user, ...(pass ? [`-p${pass}`] : []), db, '-e',
      `DELETE FROM management_fees WHERE owner_name LIKE 'E2E Fee Owner%' OR owner_name LIKE 'E2E Owner%';` ], { stdio: 'ignore' });
  } catch {}

  try {
    const res = await request.get('http://localhost:3000/api/landlord/rooms', { headers });
    if (!res.ok()) return;
    const rooms = await res.json();
    const dead = (Array.isArray(rooms) ? rooms : []).filter((r) => /^E2E Fee Room/.test(r.title || ''));
    for (const room of dead) {
      let feeIds = [];
      try {
        const fees = await request.get('http://localhost:3000/api/landlord/management-fees', {
          headers, params: { room_id: room.id },
        });
        if (fees.ok()) feeIds = (await fees.json()).map((f) => f.id);
      } catch {}
      cleanupFeeRows(feeIds);
      await request.delete(`http://localhost:3000/api/landlord/rooms/${room.id}`, { headers }).catch(() => {});
    }
  } catch {}
}

test('management fees add-on: subscribe, create an invoice, and mark it paid', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const headers = authHeader(landlordToken);
  const feeIds = [];

  await purgeDeadFeeFixtures(request, headers);

  // Reset any leftover subscription so the panel shows the subscribe actions.
  await request.post('http://localhost:3000/api/landlord/management-fees/addon/cancel', { headers }).catch(() => {});

  const roomRes = await request.post('http://localhost:3000/api/landlord/rooms', {
    headers,
    data: { title: 'E2E Fee Room', price: 300, description: 'Management fees E2E fixture' },
  });
  expect(roomRes.ok()).toBeTruthy();
  const room = await roomRes.json();

  try {
    await openMgmtFeesTab(page);
    await expect(page.getByRole('button', { name: 'Subscribe Monthly' })).toBeVisible();

    await page.getByRole('button', { name: 'Subscribe Monthly' }).click();
    await expect(page.getByText('Management Fees is active')).toBeVisible();

    await page.getByRole('button', { name: 'Create Management Fee' }).first().click();
    const modal = page.locator('.admin-modal-wide');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Create Management Fee')).toBeVisible();

    // Search-by-name room picker.
    await modal.locator('#ll-mf-room').fill('E2E Fee Room');
    await modal.locator('.ll-fee-room-opt', { hasText: 'E2E Fee Room' }).first().click();
    await expect(modal.getByText(/Fee will be attached to E2E Fee Room/)).toBeVisible();

    await modal.locator('#ll-mf-owner-name').fill('E2E Fee Owner');
    await modal.locator('#ll-mf-owner-contact').fill('+855 12 999 999');
    await modal.locator('#ll-mf-start').fill('2026-09-01');
    await modal.locator('#ll-mf-end').fill('2026-09-30');
    await modal.locator('#ll-mf-due').fill('2026-10-05');

    // First line item ships pre-filled as "Maintenance fee".
    const firstDescription = modal.locator('.ll-fee-item').first().locator('input').nth(0);
    await firstDescription.fill('Maintenance fee');
    await modal.locator('.ll-fee-item').first().locator('input').nth(2).fill('25');

    await modal.getByRole('button', { name: 'Add line item' }).click();
    const secondItem = modal.locator('.ll-fee-item').nth(1);
    await secondItem.locator('input').nth(0).fill('Gardening / repaint');
    await secondItem.locator('input').nth(2).fill('40');

    // Total is the live sum of the line items.
    await expect(modal.locator('#ll-mf-total')).toHaveText('$65.00');

    await modal.getByRole('button', { name: 'Create Fee' }).click();
    await expect(page.getByText('E2E Fee Owner')).toBeVisible();
    await expect(page.getByText('$65.00').first()).toBeVisible();

    // Mark it paid once the owner settles.
    const row = page.locator('.ll-queue-row', { hasText: 'E2E Fee Owner' });
    await row.getByRole('button', { name: 'Mark Paid' }).click();
    await expect(row.getByText('Paid', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Mark Paid' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Delete management fee for E2E Fee Room' })).toHaveCount(0);
  } finally {
    const list = await request.get('http://localhost:3000/api/landlord/management-fees', {
      headers,
      params: { room_id: room.id },
    });
    if (list.ok()) {
      const rows = await list.json();
      rows.forEach((r) => feeIds.push(r.id));
    }
    await request.delete(`http://localhost:3000/api/landlord/rooms/${room.id}`, { headers }).catch(() => {});
    cleanupFeeRows(feeIds);
  }
});

test('management fees: per-room view, paid-delete guard, and cancel', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const headers = authHeader(landlordToken);
  const feeIds = [];

  await request.post('http://localhost:3000/api/landlord/management-fees/addon', { headers, data: { plan: 'yearly' } });

  const roomARes = await request.post('http://localhost:3000/api/landlord/rooms', {
    headers, data: { title: 'E2E Fee Room A', price: 250, description: 'E2E fee fixture' },
  });
  const roomBRes = await request.post('http://localhost:3000/api/landlord/rooms', {
    headers, data: { title: 'E2E Fee Room B', price: 300, description: 'E2E fee fixture' },
  });
  expect(roomARes.ok()).toBeTruthy();
  expect(roomBRes.ok()).toBeTruthy();
  const roomA = await roomARes.json();
  const roomB = await roomBRes.json();

  let feeAId;
  let feeBId;
  try {
    const feeARes = await request.post('http://localhost:3000/api/landlord/management-fees', {
      headers,
      data: {
        room_id: roomA.id, owner_name: 'E2E Owner A', period_start: '2026-09-01', period_end: '2026-09-30',
        due_date: '2026-10-05', currency: 'USD',
        line_items: [{ description: 'Maintenance fee', quantity: 1, amount: 25 }],
      },
    });
    expect(feeARes.ok()).toBeTruthy();
    feeAId = (await feeARes.json()).id;

    const feeBRes = await request.post('http://localhost:3000/api/landlord/management-fees', {
      headers,
      data: {
        room_id: roomB.id, owner_name: 'E2E Owner B', period_start: '2026-09-01', period_end: '2026-09-30',
        due_date: '2026-10-05', currency: 'USD',
        line_items: [{ description: 'Maintenance fee', quantity: 1, amount: 40 }],
      },
    });
    expect(feeBRes.ok()).toBeTruthy();
    feeBId = (await feeBRes.json()).id;

    // Paid invoices cannot be deleted.
    await request.patch(`http://localhost:3000/api/landlord/management-fees/${feeAId}/mark-paid`, { headers });
    const paidDelete = await request.delete(`http://localhost:3000/api/landlord/management-fees/${feeAId}`, { headers });
    expect(paidDelete.status()).toBe(400);

    // Pending ones can.
    const pendingDelete = await request.delete(`http://localhost:3000/api/landlord/management-fees/${feeBId}`, { headers });
    expect(pendingDelete.status()).toBe(204);
    feeBId = null;

    await openMgmtFeesTab(page);
    // A fresh invoice for room B so the per-room view has something to show.
    const feeB2Res = await request.post('http://localhost:3000/api/landlord/management-fees', {
      headers,
      data: {
        room_id: roomB.id, owner_name: 'E2E Owner B', period_start: '2026-09-01', period_end: '2026-09-30',
        due_date: '2026-10-05', currency: 'USD',
        line_items: [{ description: 'Maintenance fee', quantity: 1, amount: 40 }],
      },
    });
    feeBId = (await feeB2Res.json()).id;

    // Room card → fees page filters the list to that room only.
    await page.getByRole('tab', { name: 'Listings' }).click();
    const roomCardB = page.locator('.ll-prop', { hasText: 'E2E Fee Room B' });
    await roomCardB.locator('.ll-prop-action.ll-fees').click();
    await expect(page).toHaveURL(/\/landlord/);
    const chip = page.locator('.ll-filter-chip', { hasText: 'E2E Fee Room B' });
    await expect(chip).toBeVisible();
    await expect(page.getByText('E2E Owner B')).toBeVisible();
    await expect(page.getByText('E2E Owner A')).toHaveCount(0);

    // Summary tiles: expected from the unpaid invoice, collected from the paid one.
    await expect(page.getByText('Expected (USD)')).toBeVisible();
    await expect(page.getByText('Collected (USD)')).toBeVisible();

    // Subscribe actions disappear once a subscription is active; cancel is offered.
    await expect(page.getByText('Management Fees is active')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel subscription' }).click();
    await page.getByRole('button', { name: 'Delete Add-on' }).click();
    await expect(page.getByText(/Add-on cancelled/i)).toBeVisible();
  } finally {
    if (feeBId) feeIds.push(feeBId);
    if (feeAId) feeIds.push(feeAId);
    await request.delete(`http://localhost:3000/api/landlord/rooms/${roomA.id}`, { headers }).catch(() => {});
    await request.delete(`http://localhost:3000/api/landlord/rooms/${roomB.id}`, { headers }).catch(() => {});
    cleanupFeeRows(feeIds);
  }
});