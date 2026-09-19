// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker: specs share one database and the same fixture accounts
  // (student01, landlord@test.com), so parallel workers collide on tokens and
  // shared rows. fullyParallel:true then runs tests within a file sequentially.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm --prefix frontend run dev',
      url: 'http://localhost:5173',
      // Always start a fresh server: reusing whatever happens to be listening
      // silently reuses stale/crashed processes (e.g. a backend that fails to
      // boot against a changed .env), which produced confusing 500-mass
      // failures. A port already in use now fails loudly instead.
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'npm --prefix backend start',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});