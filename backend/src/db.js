import mysql from 'mysql2/promise';
import { settings } from './config.js';

export const pool = mysql.createPool({
  host: settings.db.host,
  port: settings.db.port,
  database: settings.db.name,
  user: settings.db.user,
  password: settings.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

export const q = async (sql, params) => {
  // InnoDB deadlocks (1213) and lock wait timeouts (1205) are expected under
  // concurrency (e.g. parallel booking creation locking the same parent rows).
  // Since every statement here runs autocommitted, a single retry is safe.
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const retryable = err && (err.errno === 1213 || err.errno === 1205);
      if (!retryable || attempt >= 2) throw err;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, attempt * 20));
    }
  }
};

export const one = async (sql, params) => {
  const [rows] = await q(sql, params);
  return rows[0] ?? null;
};