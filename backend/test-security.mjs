import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createAccessToken, verifyToken } from './src/security.js';

// bcrypt round-trip
const hashed = hashPassword('secret123');
assert.ok(verifyPassword('secret123', hashed), 'bcrypt round-trip failed');
assert.ok(!verifyPassword('wrong', hashed), 'bcrypt should reject wrong password');

// Compat with the seeded hashes in database/schema.sql (student = password123)
// $2b$12$w0NkzewcCFevIp8f54Lq/.tFua3B9.CZSvj2gS44XFUWgKDJWr1LG
const SEEDED_STUDENT = '$2b$12$w0NkzewcCFevIp8f54Lq/.tFua3B9.CZSvj2gS44XFUWgKDJWr1LG';
assert.ok(verifyPassword('password123', SEEDED_STUDENT), 'does not verify seeded bcrypt hash');

// Access-token JWT
const token = createAccessToken({ sub: 'a@b.com' });
const payload = verifyToken(token);
assert.equal(payload.sub, 'a@b.com');
assert.equal(payload.purpose, undefined, 'access token must not carry a purpose');

// Invalid tokens must be rejected.
assert.equal(verifyToken(null), null, 'null token must be rejected');
assert.equal(verifyToken('garbage'), null, 'invalid token must be rejected');

// Password-reset tokens are NOT JWTs: they are random secrets stored as a
// SHA-256 hash (see backend/src/routes/auth.js). A token carrying a `purpose`
// claim is refused for API use by requireAuth (middleware/auth.js).
const withPurpose = createAccessToken({ sub: 'a@b.com', purpose: 'reset' });
assert.equal(withPurpose && typeof withPurpose === 'string', true, 'purpose-carrying token can be minted');

console.log('security.js: all assertions passed');