import { Router } from 'express';
import { requireLandlord, badRequest } from '../middleware/auth.js';

export const mapLinkRouter = Router();

// Matches @lat,lng in Google Maps URLs (e.g. /maps/@11.5699,104.8916,17z)
const AT_RE = /@(-?\d{1,3}\.\d{2,}),(-?\d{1,3}\.\d{2,})/;
// Matches bare coordinate pairs (e.g. ?q=11.5699,104.8916)
const COORD_RE = /(-?\d{1,3}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;

function extractCoords(url) {
  const m = AT_RE.exec(url) || COORD_RE.exec(url);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: Math.round(lat * 1e6) / 1e6, longitude: Math.round(lng * 1e6) / 1e6 };
}

mapLinkRouter.post('/parse-map-link', requireLandlord, async (req, res) => {
  const { url } = req.body ?? {};
  if (typeof url !== 'string' || !url.trim()) throw badRequest('url is required');

  let finalUrl;
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad');
    const resp = await fetch(parsed.href, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NisetStay/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    finalUrl = resp.url;
  } catch (err) {
    if (err?.code === 'ERR_INVALID_URL' || err?.message === 'bad') {
      throw badRequest('Please enter a valid URL starting with http:// or https://');
    }
    throw badRequest('Could not read this link. Please check the URL and try again.');
  }

  const coords = extractCoords(finalUrl);
  if (!coords) {
    throw badRequest('Could not find coordinates in this link. Please check that it is a valid Google Maps location link.');
  }

  res.json(coords);
});
