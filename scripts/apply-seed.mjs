// Applies database/seed.sql to the local dev/e2e database before test runs.
// The file is idempotent (INSERT ... ON DUPLICATE KEY), so re-running is safe;
// it guarantees the Playwright suites always start from a known dataset even
// after manual wipes or a fresh schema import.
//
// Read-only look at the environment: it loads backend/.env for the same DB
// credentials the API uses, but never starts the server.
//
// Paths are resolved relative to this script, so it works from any directory.

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const dotenv = require(path.join(rootDir, 'backend/node_modules/dotenv'));
const mysql = require(path.join(rootDir, 'backend/node_modules/mysql2/promise.js'));

dotenv.config({ path: path.join(rootDir, 'backend/.env'), override: false });

const { DB_HOST = '127.0.0.1', DB_PORT = '3306', DB_NAME = 'niset_stay', DB_USER = 'root', DB_PASSWORD = '' } = process.env;

const seedFile = path.join(rootDir, 'database/seed.sql');
let sql;
try {
  sql = await readFile(seedFile, 'utf8');
} catch (err) {
  console.error(`[apply-seed] Cannot read ${seedFile}: ${err.message}`);
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  multipleStatements: true,
  connectTimeout: 10000,
});

try {
  // Fail with a helpful message when the schema/migration hasn't been applied.
  const [col] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [DB_NAME]
  );
  if (Number(col[0].n) === 0) {
    throw new Error(`table 'users' is missing in '${DB_NAME}'. Apply database/schema.sql (or migration.sql) first.`);
  }
  await conn.query(sql);
  console.log(`[apply-seed] Applied ${seedFile} to ${DB_NAME}`);
} catch (err) {
  console.error(
    `[apply-seed] FAILED to seed ${DB_NAME}.\n` +
      'Make sure database/schema.sql has been applied first and the backend .env DB settings are correct.',
    err.message
  );
  process.exitCode = 1;
} finally {
  await conn.end();
}