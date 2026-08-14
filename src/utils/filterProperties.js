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
 *   sort?: 'price_asc' | 'price_desc' | 'default'
 * }
 */
export function filterProperties(properties, criteria = {}) {
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

  // Sorting
  if (criteria.sort === 'price_asc') {
    results.sort((a, b) => (parsePrice(a.price) || 0) - (parsePrice(b.price) || 0));
  } else if (criteria.sort === 'price_desc') {
    results.sort((a, b) => (parsePrice(b.price) || 0) - (parsePrice(a.price) || 0));
  }
  // 'default' keeps original order

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
    sort: searchParams.get('sort') || 'default',
  };
}
