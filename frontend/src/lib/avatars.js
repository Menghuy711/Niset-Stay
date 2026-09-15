// Deterministic "generated avatar" support.
//
// A generated avatar is stored on the user as a compact token (`gen:<seed>`)
// and rendered by regenerating a small SVG from that seed, so the avatar
// stays identical across sessions and devices without storing any binary
// data. `newAvatarSeed()` + `buildAvatarSet()` drive the "Choose an Avatar" /
// "Shuffle Avatars" flow in the profile page.

const AVATAR_PREFIX = 'gen:';
const AVATAR_SET_SIZE = 8;

const PALETTE = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#0ea5e9'],
  ['#ec4899', '#f59e0b'],
  ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#22d3ee'],
  ['#f43f5e', '#fbbf24'],
];

function randomHex(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function hashString(str) {
  let h = 2166136261 ^ 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initialsOf(label = '') {
  const clean = (label || '').trim();
  if (!clean) return '?';
  return clean
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function buildAvatar(seedKey, label) {
  const h = hashString(seedKey);
  const rnd = mulberry32(h);
  const [c1, c2] = PALETTE[(rnd() * PALETTE.length) | 0];
  const tilt = ((rnd() * 360) | 0) % 360;
  const blobCx = 40 + ((rnd() * 120) | 0);
  const blobCy = 30 + ((rnd() * 120) | 0);
  const blobR = 50 + ((rnd() * 40) | 0);
  const gradId = `g${h.toString(16)}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${tilt} .5 .5)">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="200" height="200" fill="url(#${gradId})"/>` +
    `<circle cx="${blobCx}" cy="${blobCy}" r="${blobR}" fill="rgba(255,255,255,0.16)"/>` +
    `<text x="100" y="124" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="700"` +
    ` fill="rgba(255,255,255,0.95)" text-anchor="middle">${initialsOf(label)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/** Fresh random base seed for a new page of generated avatars. */
export function newAvatarSeed() {
  return randomHex(8);
}

/** Token that fully determines one generated avatar, stored as image_url. */
export function avatarToken(baseSeed, index) {
  return `${AVATAR_PREFIX}${baseSeed}-${index}`;
}

export function isGeneratedAvatar(value) {
  return typeof value === 'string' && value.startsWith(AVATAR_PREFIX);
}

/** The stored avatar for the user ('' when the value isn't a generated one). */
export function resolveAvatarUrl(token, label) {
  if (!isGeneratedAvatar(token)) return '';
  return buildAvatar(token.slice(AVATAR_PREFIX.length), label);
}

/** A fresh page of generated avatars to show in the picker. */
export function buildAvatarSet(baseSeed, label) {
  return Array.from({ length: AVATAR_SET_SIZE }, (_, i) => ({
    token: avatarToken(baseSeed, i),
    url: buildAvatar(`${baseSeed}-${i}`, label),
  }));
}