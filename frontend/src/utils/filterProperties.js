/**
 * Utility functions for filtering property listings.
 */

/**
 * Extract numeric price from strings like "$95 per month" or "$105.55 per month"
 * Returns null if parsing fails.
 */
export function parsePrice(priceStr) {
  if (!priceStr) return null;
  const match = priceStr.match(/\$([0-9,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

/**
 * Extract district/area from a Phnom Penh address string.
 * e.g. "Boeng Keng Kang I, Boeng Keng Kang, Phnom Penh, Cambodia" → "Boeng Keng Kang"
 * e.g. "Tuol Kouk, Phnom Penh, Cambodia" → "Tuol Kouk"
 */
export function extractDistrict(address) {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim());
  // Phnom Penh addresses typically: [sub-area], [district], Phnom Penh, Cambodia
  // Return the district (second-to-last before "Phnom Penh")
  const ppIndex = parts.findIndex((p) => p.toLowerCase().includes('phnom penh'));
  if (ppIndex > 0) {
    return parts[ppIndex - 1];
  }
  // Fallback: return the part before the last one if it's not Phnom Penh
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0] || '';
}

/**
 * Extract bed count from metas like ["1 Bed", "1 Bath", "1430 sqft"]
 */
export function extractBedCount(metas) {
  if (!Array.isArray(metas)) return null;
  const bedMeta = metas.find((m) => /\d+\s*Bed/i.test(m));
  if (!bedMeta) return null;
  const match = bedMeta.match(/(\d+)\s*Bed/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get all unique districts from a list of properties.
 */
export function getUniqueDistricts(properties) {
  const districts = new Set();
  properties.forEach((p) => {
    const district = extractDistrict(p.address);
    if (district) districts.add(district);
  });
  return Array.from(districts).sort();
}

/**
 * Great-circle distance in km between two WGS84 points (Haversine).
 * Returns null when either point is missing/out of range.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;
  const nums = [lat1, lng1, lat2, lng2].map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [la1, lo1, la2, lo2] = nums;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(la2 - la1);
  const dLng = toRad(lo2 - lo1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get price range (min, max) from properties.
 */
export function getPriceRange(properties) {
  const prices = properties
    .map((p) => parsePrice(p.price))
    .filter((p) => p !== null);
  if (prices.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  };
}

/**
 * Filter properties based on criteria object.
 *
 * criteria: {
 *   query?: string,        // keyword search in title/address
 *   location?: string,     // district name
 *   minPrice?: number,
 *   maxPrice?: number,
 *   beds?: number,         // exact bed count
 *   universityId?: string, // campus to filter around (uses `universities`)
 *   distance?: string,     // max km from that campus
 *   sort?: 'price_asc' | 'price_desc' | 'default'
 * }
 */
export function filterProperties(properties, criteria = {}, universities = []) {
  let results = [...properties];

  // Keyword search (title or address)
  if (criteria.query) {
    const q = criteria.query.toLowerCase();
    results = results.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  }

  // District/location filter
  if (criteria.location) {
    const loc = criteria.location.toLowerCase();
    results = results.filter((p) => {
      const district = extractDistrict(p.address).toLowerCase();
      return district === loc || p.address.toLowerCase().includes(loc);
    });
  }

  // Price min
  if (criteria.minPrice !== undefined && criteria.minPrice !== '') {
    const min = Number(criteria.minPrice);
    if (!isNaN(min)) {
      results = results.filter((p) => {
        const price = parsePrice(p.price);
        return price !== null && price >= min;
      });
    }
  }

  // Price max
  if (criteria.maxPrice !== undefined && criteria.maxPrice !== '') {
    const max = Number(criteria.maxPrice);
    if (!isNaN(max)) {
      results = results.filter((p) => {
        const price = parsePrice(p.price);
        return price !== null && price <= max;
      });
    }
  }

  // Bed count
  if (criteria.beds !== undefined && criteria.beds !== '' && criteria.beds !== null) {
    const beds = Number(criteria.beds);
    if (!isNaN(beds)) {
      results = results.filter((p) => extractBedCount(p.metas) === beds);
    }
  }

  // Distance from a chosen university (km). Rooms without coordinates drop out.
  if (
    criteria.universityId !== undefined &&
    criteria.universityId !== '' &&
    criteria.distance !== undefined &&
    criteria.distance !== ''
  ) {
    const uni = universities.find((u) => String(u.id) === String(criteria.universityId));
    const maxKm = Number(criteria.distance);
    if (uni && Number.isFinite(maxKm)) {
      results = results.filter((p) => {
        const km = haversineKm(uni.latitude, uni.longitude, p.rawLatitude, p.rawLongitude);
        return km !== null && km <= maxKm;
      });
    }
  }

  // Sorting — items with an unparseable price keep their position last,
  // regardless of direction, instead of getting coerced to $0 and sorted first.
  if (criteria.sort === 'price_asc' || criteria.sort === 'price_desc') {
    const direction = criteria.sort === 'price_asc' ? 1 : -1;
    const priced = [];
    const unpriced = [];
    results.forEach((p) => {
      const price = parsePrice(p.price);
      (price === null ? unpriced : priced).push({ p, price });
    });
    priced.sort((a, b) => (a.price - b.price) * direction);
    results = [...priced.map((x) => x.p), ...unpriced];
  }

  return results;
}

/**
 * Build URL search params from filter criteria.
 */
export function buildSearchParams(criteria) {
  const params = new URLSearchParams();
  if (criteria.query) params.set('q', criteria.query);
  if (criteria.location) params.set('location', criteria.location);
  if (criteria.minPrice !== undefined && criteria.minPrice !== '') params.set('minPrice', String(criteria.minPrice));
  if (criteria.maxPrice !== undefined && criteria.maxPrice !== '') params.set('maxPrice', String(criteria.maxPrice));
  if (criteria.beds !== undefined && criteria.beds !== '' && criteria.beds !== null) params.set('beds', String(criteria.beds));
  if (criteria.universityId && criteria.universityId !== '') params.set('universityId', String(criteria.universityId));
  if (criteria.distance && criteria.distance !== '') params.set('distance', String(criteria.distance));
  if (criteria.sort && criteria.sort !== 'default') params.set('sort', criteria.sort);
  return params;
}

/**
 * Parse URL search params into filter criteria.
 */
export function parseSearchParams(searchParams) {
  return {
    query: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    beds: searchParams.get('beds') || '',
    universityId: searchParams.get('universityId') || '',
    distance: searchParams.get('distance') || '',
    sort: searchParams.get('sort') || 'default',
  };
}
