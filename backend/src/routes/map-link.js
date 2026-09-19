import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import dns from 'node:dns/promises';
import net from 'node:net';
import { settings } from '../config.js';
import { requireLandlord, badRequest, HttpError } from '../middleware/auth.js';

export const mapLinkRouter = Router();

// Matches @lat,lng in Google Maps URLs (e.g. /maps/@11.5699,104.8916,17z)
const AT_RE = /@(-?\d{1,3}\.\d{2,}),(-?\d{1,3}\.\d{2,})/;
// Matches the zoom token that follows the coordinate pair (e.g. ,17z)
const ZOOM_RE = /@(-?\d{1,3}\.\d{2,}),(-?\d{1,3}\.\d{2,}),(\d+(?:\.\d+)?)z/;
// Matches bare coordinate pairs (e.g. ?q=11.5699,104.8916)
const COORD_RE = /(-?\d{1,3}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;
// Matches the exact place pin Google adds to place URLs (e.g. !8m2!3d11.5688!4d104.8931)
const PIN_RE = /!8m2!3d(-?\d{1,3}\.\d{2,})!4d(-?\d{1,3}\.\d{2,})/;

// Follows at most N hops so a malicious chain can't loop the server forever.
const MAX_REDIRECTS = 3;

function clampZoom(zoom) {
  const num = parseFloat(zoom);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.min(21, Math.max(3, num)));
}

// Strip Google's tracking params (entry/g_ep/skid) so the stored link is tidy
// but still resolves to the exact place + pin Google returns when shared.
function stripTracking(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const drop = new Set(['entry', 'g_ep', 'skid']);
  for (const key of [...u.searchParams.keys()]) {
    if (drop.has(key)) u.searchParams.delete(key);
  }
  u.search = u.searchParams.toString();
  return u.toString();
}

// Prefer the place pin over the camera center: when a "Share" link is copied,
// Google rotates the map so the pin may NOT be at the @lat,lng center. Using the
// center stores a marker that can be hundreds of meters away from the real spot.
function extractCoords(url) {
  const m = PIN_RE.exec(url) || AT_RE.exec(url) || COORD_RE.exec(url);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const zoomMatch = ZOOM_RE.exec(url);
  return {
    latitude: Math.round(lat * 1e6) / 1e6,
    longitude: Math.round(lng * 1e6) / 1e6,
    zoom: clampZoom(zoomMatch ? zoomMatch[3] : null),
  };
}

// Block RFC1918 / loopback / link-local / CGNAT / metadata / multicast / reserved
// space (IPv4). Cloud metadata (169.254.169.254) and bridge interfaces (192.168.*)
// are the classic SSRF targets, so they are rejected explicitly.
function isPublicIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  if (a === 0) return false; // 0.0.0.0/8 "this network"
  if (a === 10) return false; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 CGNAT
  if (a === 127) return false; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return false; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 0 && p[2] === 2) return false; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return false; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && p[2] === 100) return false; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && p[2] === 113) return false; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return false; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return true;
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPublicIPv4(address);
  if (family === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) return isPublicIPv4(lower.slice(7)); // IPv4-mapped
    if (lower === '::' || lower === '::1') return false; // unspecified + loopback
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false; // fc00::/7 ULA
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return false; // fe80::/10 link-local
    if (lower.startsWith('2001:db8')) return false; // 2001:db8::/32 documentation
    if (lower.startsWith('ff')) return false; // ff00::/8 multicast
    return true;
  }
  return false;
}

// Resolve the host and reject it unless EVERY address it maps to is public.
// (A mixed A/AAAA answer can land the fetch on the private record.)
async function assertPublicHost(hostname) {
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) return;
  for (const { address } of records) {
    if (!isPublicAddress(address)) {
      throw badRequest('This link points to an internal address, which is not allowed.');
    }
  }
}

const isProd = process.env.NODE_ENV === 'production';
const mapLinkLimit = settings.debug && !isProd ? 100 : 30;
const mapLinkLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: mapLinkLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (_req, res) => res.status(429).json({ detail: 'Rate limit exceeded: too many link lookups' }),
});

mapLinkRouter.post('/parse-map-link', requireLandlord, mapLinkLimiter, async (req, res) => {
  const { url } = req.body ?? {};
  if (typeof url !== 'string' || !url.trim()) throw badRequest('url is required');

  let finalUrl;
  try {
    let current = url.trim();
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const parsed = new URL(current);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad');
      await assertPublicHost(parsed.hostname);

      const resp = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NisetStay/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
        if (hop === MAX_REDIRECTS) throw new Error('too many redirects');
        current = new URL(resp.headers.get('location'), current).href;
        continue;
      }
      finalUrl = resp.url || current;
      break;
    }
    if (!finalUrl) throw new Error('too many redirects');
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err?.code === 'ERR_INVALID_URL' || err?.message === 'bad') {
      throw badRequest('Please enter a valid URL starting with http:// or https://');
    }
    if (err?.message === 'too many redirects') {
      throw badRequest('This link redirects too many times. Please paste the full Google Maps link instead.');
    }
    throw badRequest('Could not read this link. Please check the URL and try again.');
  }

  const coords = extractCoords(finalUrl);
  if (!coords) {
    throw badRequest('Could not find coordinates in this link. Please check that it is a valid Google Maps location link.');
  }

  res.json({
    ...coords,
    url: stripTracking(finalUrl),
  });
});