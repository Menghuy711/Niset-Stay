// Central HTTP client for the Express backend.
// The session is carried by an httpOnly `niset_token` cookie, so browsers
// never read/write the token directly. API errors are normalized here.

const _configured = import.meta.env.VITE_API_BASE_URL;
const _isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

if (!_configured && !_isLocalhost) {
  console.error(
    '[api.js] VITE_API_BASE_URL is not set. All API calls will fail. ' +
    'Set VITE_API_BASE_URL in your .env file or GitHub Actions secret.'
  );
}

const BASE_URL = _configured || (_isLocalhost ? 'http://localhost:3000' : '');

const TIMEOUT_MS = 15000;

function normalizeError(message, status, kind) {
  const err = new Error(message);
  err.status = status;
  err.kind = kind;
  return err;
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      // Send cookies so CORS + cookie-based auth works across origins.
      credentials: 'include',
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw normalizeError('The request timed out. Please check your connection and try again.', 0, 'timeout');
    }
    throw normalizeError(
      'Unable to reach the server. Check your internet connection and try again.',
      0,
      'network'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (typeof data?.detail === 'string') message = data.detail;
    else if (Array.isArray(data?.detail)) {
      message = data.detail.map((d) => d.msg?.replace(/^Value error,\s*/, '') || JSON.stringify(d)).join(', ');
    } else if (data?.message) message = data.message;

    let kind = 'server';
    if (res.status === 401) kind = 'unauthorized';
    else if (res.status === 403) kind = 'forbidden';
    else if (res.status === 404) kind = 'not_found';
    else if (res.status === 429) kind = 'rate_limited';
    throw normalizeError(message, res.status, kind);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Resolve an image URL coming from the DB:
 *  uploaded files start with /uploads -> prefix with API base,
 *  anything else is a local asset served by the frontend. */
export function imageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return `${BASE_URL}${url}`;
  return url;
}

export default api;
