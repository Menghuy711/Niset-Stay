import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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
const API = 'http://localhost:3000/api/landlord';

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

async function openLandlord(page) {
  await loginAs(page, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Landlord Portal' }).first().click();
  await expect(page).toHaveURL(/\/landlord/);
}

function cleanupBillRows(billIds) {
  if (!billIds.length) return;
  const { user, pass, db } = readDbEnv();
  try {
    execFileSync('mysql', [ '-u', user, ...(pass ? [`-p${pass}`] : []), db, '-e', `DELETE FROM bill_items WHERE bill_id IN (${billIds.join(',')}); DELETE FROM bills WHERE id IN (${billIds.join(',')});` ], { stdio: 'ignore' });
  } catch (err) {
    console.error('mysql teardown failed:', err.message);
  }
}

function cleanupConfig() {
  const { user, pass, db } = readDbEnv();
  try {
    execFileSync('mysql', [ '-u', user, ...(pass ? [`-p${pass}`] : []), db, '-e', 'DELETE FROM billing_config WHERE landlord_id = 6;' ], { stdio: 'ignore' });
  } catch {
    /* best-effort teardown */
  }
}

async function purgeStudentsByName(request, headers, name) {
  const res = await request.get(`${API}/students`, { headers });
  const rows = await res.json();
  const targets = rows.filter((s) => s.full_name.includes(name));
  for (const s of targets) {
    await request.delete(`${API}/students/${s.id}`, { headers }).catch(() => {});
  }
}

function dateKeyOffset(days) {
  const d = new Date(Date.now() + days * 86400000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

test('students: register with optional details, flags, filters, assign, remove, manage bills', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const headers = authHeader(landlordToken);
  const studentIds = [];
  await purgeStudentsByName(request, headers, 'Sokha E2E');
  await purgeStudentsByName(request, headers, 'Visa Old Student');
  await purgeStudentsByName(request, headers, 'E2E Billed Student');

  // Control student with an already-expired visa + daily type (via API).
  const oldRes = await request.post(`${API}/students`, {
    headers,
    data: { full_name: 'Visa Old Student', student_type: 'daily', nationality: 'Thai', visa_expiry_date: '2020-01-01' },
  });
  expect(oldRes.ok()).toBeTruthy();
  const oldStudent = await oldRes.json();
  studentIds.push(oldStudent.id);

  await openLandlord(page);
  await page.getByRole('tab', { name: 'Students' }).click();

  // Register a new student through the extended modal.
  const visaSoon = dateKeyOffset(20);
  const contractStart = dateKeyOffset(-30);
  const contractEnd = dateKeyOffset(400);
  await page.getByRole('button', { name: 'Add Student' }).first().click();
  const modal = page.locator('.admin-room-modal');
  await expect(modal).toBeVisible();
  await modal.locator('#ll-student-name').fill('Sokha E2E');
  await modal.locator('.ll-student-type-seg').getByRole('button', { name: 'Daily' }).click();
  await modal.locator('#ll-student-nationality').fill('Chinese');
  await modal.locator('#ll-student-visa').fill(visaSoon);
  await modal.locator('#ll-student-contract-start').fill(contractStart);
  await modal.locator('#ll-student-contract-end').fill(contractEnd);
  await modal.getByRole('button', { name: 'Add Student' }).click();
  await expect(modal).toHaveCount(0);

  const row = page.locator('.ll-row-student', { hasText: 'Sokha E2E' });
  await expect(row).toBeVisible();
  await expect(row.locator('.ll-student-flag-warn').first()).toBeVisible();
  await expect(row.getByText('Chinese')).toBeVisible();

  // Unassigned → pick the first vacant room and assign.
  await expect(row.getByText('Unassigned', { exact: true })).toBeVisible();
  const assignSelect = row.getByLabel('Assign Sokha E2E to a room');
  const roomsRes = await request.get(`${API}/rooms`, { headers });
  const rooms = await roomsRes.json();
  const vacant = rooms.find((r) => r.status !== 'occupied');
  await assignSelect.selectOption(String(vacant.id));
  await row.getByRole('button', { name: 'Assign' }).click();

  await expect(row.getByText('Unassigned', { exact: true })).not.toBeVisible();
  await expect(row.getByText(vacant.title)).toBeVisible();
  await expect(row.getByRole('button', { name: 'Remove from Room' })).toBeVisible();

  // Type filter hides monthly students; the two daily ones stay. (Other
  // parallel specs may concurrently create monthly students, so assert on the
  // daily rows disappearing rather than a global empty-state.)
  await page.locator('.ll-students-toolbar .ll-status-seg').getByRole('button', { name: 'Monthly' }).click();
  await expect(row).not.toBeVisible();
  await expect(page.locator('.ll-row-student', { hasText: 'Visa Old Student' })).not.toBeVisible();
  await page.locator('.ll-students-toolbar .ll-status-seg').getByRole('button', { name: 'All' }).click();
  await expect(row).toBeVisible();

  // Room filter.
  await page.locator('.ll-students-toolbar .ll-student-room-filter select').selectOption('assigned');
  await expect(row).toBeVisible();
  await expect(page.locator('.ll-row-student', { hasText: 'Visa Old Student' })).toHaveCount(0);
  await page.locator('.ll-students-toolbar .ll-student-room-filter select').selectOption('all');

  // Manage Bills jumps to the Bills tab filtered to this student.
  await row.getByRole('button', { name: 'Manage Bills' }).click();
  await expect(page.getByRole('tab', { name: 'Bills' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ll-filter-chip').getByText('Sokha E2E')).toBeVisible();
  await page.getByRole('tab', { name: 'Students' }).click();
  await expect(row).toBeVisible();

  // The expired-visa control student shows the "expired" flag.
  const oldRow = page.locator('.ll-row-student', { hasText: 'Visa Old Student' });
  await expect(oldRow.locator('.ll-student-flag-error').first()).toBeVisible();

  // Remove from Room → back to unassigned.
  await row.getByRole('button', { name: 'Remove from Room' }).click();
  await page.getByRole('button', { name: 'Delete Assignment' }).click();
  await expect(row.getByText('Unassigned', { exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Remove from Room' })).toHaveCount(0);

  // Delete the freshly-created student through the UI.
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete Student' }).click();
  await expect(row).toHaveCount(0);

  for (const id of studentIds) {
    await request.delete(`${API}/students/${id}`, { headers }).catch(() => {});
  }
});

test('bills: config, generate, itemized modal, filters, invoice, pending-only delete, views', async ({ page, request }) => {
  const landlordToken = await apiLogin(request, LANDLORD_EMAIL, LANDLORD_PASSWORD);
  const headers = authHeader(landlordToken);
  const billIds = [];
  const studentIds = [];
  await purgeStudentsByName(request, headers, 'E2E Billed Student');

  const configRes = await request.put(`${API}/billing-config`, {
    headers,
    data: {
      home_name: 'E2E Residence',
      default_room_fee: 150,
      electricity_rate: 0.25,
      water_rate: 1.5,
      trash_fee: 2,
      default_billing_day: 5,
      first_bill_exclude_utilities: true,
      upfront_months: 1,
      additional_fees: [{ name: 'WiFi', amount: 10 }],
    },
  });
  expect(configRes.ok()).toBeTruthy();

  const roomRes = await request.post(`${API}/rooms`, {
    headers,
    data: { title: 'E2E Bill Room', price: 150, description: 'Bills E2E fixture' },
  });
  expect(roomRes.ok()).toBeTruthy();
  const room = await roomRes.json();

  const studentRes = await request.post(`${API}/students`, {
    headers,
    data: { full_name: 'E2E Billed Student', student_type: 'monthly', room_id: room.id },
  });
  expect(studentRes.ok()).toBeTruthy();
  const student = await studentRes.json();
  studentIds.push(student.id);

  await openLandlord(page);
  await page.getByRole('tab', { name: 'Bills' }).click();

  // Configured → no banner.
  await expect(page.locator('.ll-config-banner')).toHaveCount(0);
  await expect(page.locator('.ll-bills-summary-tile').first()).toBeVisible();

  // Generate monthly bills for the current month.
  await page.locator('.ll-worktop').getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByText(/Generated 1 bill for/)).toBeVisible();

  let row = page.locator('.ll-row-bills', { hasText: 'E2E Billed Student' });
  await expect(row).toBeVisible();
  await expect(row.getByText('1 item')).toBeVisible();

  // View → printable invoice with itemized table.
  await row.getByRole('button', { name: 'View' }).click();
  const invoice = page.locator('.ll-invoice-doc');
  await expect(invoice).toBeVisible();
  await expect(invoice.getByText('E2E Residence')).toBeVisible();
  await expect(invoice.locator('.ll-invoice-table').getByText('Room Rent')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Telegram' })).toBeVisible();

  // Mark as paid from the invoice view.
  await page.getByRole('button', { name: 'Mark as Paid' }).click();
  await expect(page.getByText('Bill marked as paid.')).toBeVisible();
  await expect(page.locator('.ll-invoice-doc')).toHaveCount(0);

  row = page.locator('.ll-row-bills', { hasText: 'E2E Billed Student' });
  await expect(row.getByText('Paid', { exact: true })).toBeVisible();

  // Paid bills cannot be deleted.
  await expect(row.getByRole('button', { name: /Delete .* bill/ })).toHaveCount(0);

  // Expected vs collected summary after payment.
  await expect(page.locator('.ll-bills-summary-tile strong').first()).toHaveText('$0.00');
  await expect(page.locator('.ll-bills-summary-tile-collected strong')).toHaveText('$150.00');

  // Itemized bill via the modal with meter readings + live total.
  await page.getByRole('button', { name: 'Issue a Bill' }).click();
  const modal = page.locator('.admin-room-modal');
  await expect(modal).toBeVisible();
  await modal.locator('#ll-bill-student').selectOption(String(student.id));
  await modal.locator('#ll-bill-usage-from').fill('2026-09-01');
  await modal.locator('#ll-bill-usage-to').fill('2026-09-30');
  await modal.locator('#ll-bill-due').fill('2026-10-05');

  await modal.getByLabel('Toggle Electricity line').check();
  await modal.getByLabel('Electricity previous reading').fill('100');
  await modal.getByLabel('Electricity current reading').fill('140');
  await expect(modal.locator('#ll-bill-total strong')).toHaveText('$162.00');

  await modal.getByLabel('Toggle WiFi fee').check();
  await expect(modal.locator('#ll-bill-total strong')).toHaveText('$172.00');

  // Backend validates readings: current cannot be below previous.
  await modal.getByLabel('Electricity current reading').fill('90');
  await modal.getByRole('button', { name: 'Issue Bill' }).click();
  await expect(modal.getByText('Electricity: current reading cannot be below the previous reading')).toBeVisible();
  await modal.getByLabel('Electricity current reading').fill('140');

  await modal.getByRole('button', { name: 'Issue Bill' }).click();
  await expect(page.getByText('Bill issued.')).toBeVisible();
  await expect(page.locator('.ll-row-bills', { hasText: 'E2E Billed Student' })).toHaveCount(2);
  await expect(page.locator('.ll-row-bills', { hasText: '4 items' })).toBeVisible();

  // Pending-only delete of the new itemized bill.
  const newIssued = page.locator('.ll-row-bills', { hasText: '4 items' });
  await newIssued.getByRole('button', { name: /Delete .* bill/ }).click();
  await page.getByRole('button', { name: 'Delete Bill' }).click();
  await expect(page.getByText('Bill deleted.')).toBeVisible();

  // Re-generating the same month skips the already-billed student.
  await page.locator('.ll-worktop').getByRole('button', { name: /Generate/ }).click();
  await expect(page.getByText(/skipped 1 already billed/)).toBeVisible();

  // Track the (now paid) generated bill id for sql teardown.
  const billsRes = await request.get(`${API}/bills?student_id=${student.id}`, { headers });
  const bills = await billsRes.json();
  bills.forEach((b) => billIds.push(b.id));

  for (const id of studentIds) {
    await request.delete(`${API}/students/${id}`, { headers }).catch(() => {});
  }
  await request.delete(`${API}/rooms/${room.id}`, { headers }).catch(() => {});
  cleanupBillRows(billIds);
  cleanupConfig();
});