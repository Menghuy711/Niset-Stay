import { createApp } from './app.js';
import { settings } from './config.js';
import { q } from './db.js';

// Hashed forms of the PUBLIC test credentials committed in database/seed.sql
// (and historically database/schema.sql). If any of these hashes ever matches
// a live row, the deployment carries a known-password login. Refuse to boot.
const COMMITTED_SEED_HASHES = new Set([
  '$2a$12$kZOdilD3yqegiXnPIZ22ku8.lE.s1VrEhM.c8Fl1wNWkXdB7OgsOW', // superadmin@nisetstay.com / superadmin123
  '$2a$12$5c.L2EmbsH/jirGGxpltJe4QbGPhXYGZRL.vVlRhsSV.8dVEKrV0G', // admin@nisetstay.com / admin123
  '$2a$12$w0NkzewcCFevIp8f54Lq/.tFua3B9.CZSvj2gS44XFUWgKDJWr1LG', // student@test.com / password123
  '$2a$12$CpYmUDUDYudAhta1jGPKLu/SHGzRB3WJAez8mfBUfy8J.wqhjnQA.', // superadmin@nisetstay.com (seed.sql)
  '$2a$12$A17olhy6UAqWlNo.rnWAg.Ys4.sT5Jtgd0V0ZSTsOGBysf6A9bk7C', // admin@nisetstay.com (seed.sql)
  '$2a$12$izkYzZjReN8bwGZAq7s6POFh8J9CSawHdKDfo5/0CLpHX56iZy.yS', // student@test.com (seed.sql)
  '$2a$12$GXLawHdpbH1fY0s6Damw7OjT7/3Bty6D.I0CwYVbUkJ0LNbvQKS.e', // student01@test.com / password123
  '$2a$12$lQWoZDtvC58XItbpKnoAW.UZX26wPG6j5sv2eGN.KKpRfM5FpAztG', // test3@example.com / password123
  '$2a$12$XhXIX9XDaYKhhzvCqtCXIeBJCtElhSabWhvvfQK2j3lUXnezDL1vi', // landlord@test.com / landlord123
]);

async function guardProductionSeeds() {
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SEED_USERS === 'true') return;
  const [rows] = await q('SELECT email, hashed_password FROM users');
  const leaked = rows.filter((r) => COMMITTED_SEED_HASHES.has(r.hashed_password));
  if (leaked.length > 0) {
    console.error(
      `[FATAL] Refusing to start in production: ${leaked.length} user row(s) still use committed ` +
        `test credentials (e.g. ${leaked[0].email}). Remove or re-hash those accounts first. ` +
        'See database/seed.sql.'
    );
    process.exit(1);
  }
}

try {
  await guardProductionSeeds();
} catch (err) {
  // A missing users table means migrations haven't run yet — not a seed leak.
  if (err?.code !== 'ER_NO_SUCH_TABLE') {
    console.error('[FATAL] Production seed guard failed:', err.message);
    process.exit(1);
  }
}

const app = createApp();

app.listen(settings.port, () => {
  console.log(`Niset Stay API running on http://localhost:${settings.port}`);
});