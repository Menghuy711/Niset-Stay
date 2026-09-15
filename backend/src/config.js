import 'dotenv/config';

const parseIntEnv = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const parseBool = (value) => ['1', 'true', 'yes'].includes((value ?? 'false').toLowerCase());

export const PLACEHOLDER_KEY = 'your-secret-key-change-me';

// HMAC only. RSA/ECDSA/PS variants would need separate signing keys while the
// same SECRET_KEY falls through to them, turning a key leak into token forgery.
const SUPPORTED_ALGORITHMS = new Set(['HS256', 'HS384', 'HS512']);

class Settings {
  db = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseIntEnv(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'niset_stay',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  jwt = {
    secretKey: process.env.SECRET_KEY || PLACEHOLDER_KEY,
    algorithm: process.env.ALGORITHM || 'HS256',
    cookieName: process.env.COOKIE_NAME || 'niset_token',
    accessTokenExpireMinutes: parseIntEnv(process.env.ACCESS_TOKEN_EXPIRE_MINUTES, 30),
  };

  debug = parseBool(process.env.DEBUG);

  // Explicit allow-list from env wins. Otherwise (dev default) accept any
  // loopback origin with any port so the frontend keeps working whether it
  // is served on :5173, :5174, vite preview (:4173), or an IDE-launched port.
  allowedOrigins = (() => {
    const fromEnv = (process.env.ALLOWED_ORIGINS || '').trim();
    if (fromEnv) {
      return fromEnv.split(',').map((o) => o.trim()).filter(Boolean);
    }
    return (origin, cb) => {
      if (!origin) return cb(null, true);
      let host;
      try {
        host = new URL(origin).hostname.replace(/^\[|\]$/g, '');
      } catch {
        return cb(null, false);
      }
      cb(null, ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host));
    };
  })();

  port = parseIntEnv(process.env.PORT, 3000);

  validate() {
    // SECRET_KEY must never be the placeholder. This guard now runs on every
    // boot (debug or not) so a mis-deployed .env fails fast instead of
    // silently issuing unsigned/token-valid sessions.
    if (this.jwt.secretKey === PLACEHOLDER_KEY) {
      throw new Error(
        'SECRET_KEY is set to the default placeholder value. ' +
          'Generate a real secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    // The 'none' algorithm would accept unsigned tokens — never allow it.
    if (!SUPPORTED_ALGORITHMS.has(this.jwt.algorithm)) {
      throw new Error(
        `ALGORITHM must be one of: ${[...SUPPORTED_ALGORITHMS].join(', ')} (got '${this.jwt.algorithm}')`
      );
    }
  }
}

export const settings = new Settings();