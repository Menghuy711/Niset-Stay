/** Strict calendar-date helpers shared across routers. */

/** Parse "YYYY-MM-DD" and reject impossible dates (2023-02-30, 2024-13-45). Returns the normalized string or null. */
export function parseDateYMD(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  // new Date(year, month, 0).getDate() = last day of that month (leap-aware).
  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Parse client-supplied "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" into a MySQL
 * DATETIME string ("YYYY-MM-DD HH:mm:ss"). Components are taken at face value
 * (wall-clock) so a server in a different timezone than the client cannot
 * silently shift the stored date. Returns null for nothing/empty, throws a
 * 400-style error object via `badRequest` for malformed or impossible values.
 */
export function mysqlDatetime(value, badRequest, label = 'date') {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'string') {
    // Date-only and full datetime forms.
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [, y, mo, d, h = '00', mi = '00', s = '00'] = match;
      const okDate = parseDateYMD(`${y}-${mo}-${d}`);
      const hh = Number(h);
      const mm = Number(mi);
      const ss = Number(s);
      if (!okDate || hh > 23 || mm > 59 || ss > 59) {
        throw badRequest(`${label} must be a valid date (YYYY-MM-DD)`);
      }
      return `${okDate} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`${label} must be a valid date (YYYY-MM-DD)`);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}