// Central resolver for room property photos. Bundles every property-*.jpg
// exactly once (instead of once per importing module) and maps a DB filename
// or /uploads/ URL to a usable src for rendering.

import { imageUrl } from './api.js';

const propertyImages = import.meta.glob('../assets/images/property-*.jpg', {
  eager: true,
  import: 'default',
});

/**
 * Resolve a room image src for rendering.
 * - Remote/blob/data/file URLs and backend uploads pass through unchanged,
 *   with uploads prefixed by the API base like the rest of the app.
 * - A bare filename matching a bundled property-*.jpg resolves to its URL.
 * - Unknown values return '' unless `passthroughUnknown` is set.
 * - Falsy values fall back to the first bundled image when `fallbackToFirst`.
 */
export function resolveImage(src, { fallbackToFirst = false, passthroughUnknown = false } = {}) {
  if (!src) return fallbackToFirst ? Object.values(propertyImages)[0] || '' : '';
  if (/^(https?:|blob:|data:|file:)/.test(src) || src.startsWith('/uploads/')) return imageUrl(src);
  const match = Object.entries(propertyImages).find(([path]) => path.endsWith(`/${src}`));
  if (match) return match[1];
  return passthroughUnknown ? src : '';
}