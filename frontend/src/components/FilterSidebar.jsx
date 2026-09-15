import { useState, useEffect, useCallback } from 'react';
import { getUniqueDistricts, getPriceRange, parseSearchParams, buildSearchParams } from '../utils/filterProperties.js';
import { useSearchParams } from 'react-router-dom';

export default function FilterSidebar({ onFilterChange, properties = [], universities = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const districts = getUniqueDistricts(properties);
  const priceRange = getPriceRange(properties);

  const initialCriteria = parseSearchParams(searchParams);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = useCallback((key, value) => {
    setCriteria(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback((e) => {
    handleChange('query', e.target.value);
  }, [handleChange]);

  const handleLocationChange = useCallback((e) => {
    handleChange('location', e.target.value);
  }, [handleChange]);

  const handleMinPriceChange = useCallback((e) => {
    handleChange('minPrice', e.target.value === '' ? '' : Number(e.target.value));
  }, [handleChange]);

  const handleMaxPriceChange = useCallback((e) => {
    handleChange('maxPrice', e.target.value === '' ? '' : Number(e.target.value));
  }, [handleChange]);

  const handleBedsChange = useCallback((e) => {
    const value = e.target.value;
    handleChange('beds', value === '' ? '' : Number(value));
  }, [handleChange]);

  const handleUniversityChange = useCallback((e) => {
    handleChange('universityId', e.target.value);
  }, [handleChange]);

  const handleDistanceChange = useCallback((e) => {
    handleChange('distance', e.target.value);
  }, [handleChange]);

  const handleSortChange = useCallback((e) => {
    handleChange('sort', e.target.value);
  }, [handleChange]);

  const applyFilters = useCallback(() => {
    const params = buildSearchParams(criteria);
    setSearchParams(params, { replace: true });
    onFilterChange?.(criteria);
  }, [criteria, setSearchParams, onFilterChange]);

  const clearFilters = useCallback(() => {
    const cleared = {
      query: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      beds: '',
      universityId: '',
      distance: '',
      sort: 'default'
    };
    setCriteria(cleared);
    setSearchParams(new URLSearchParams(), { replace: true });
    onFilterChange?.(cleared);
  }, [setSearchParams, onFilterChange]);

  const hasActiveFilters =
    criteria.query ||
    criteria.location ||
    criteria.minPrice !== '' ||
    criteria.maxPrice !== '' ||
    criteria.beds !== '' ||
    criteria.universityId !== '' ||
    (criteria.distance !== '' && criteria.universityId !== '') ||
    criteria.sort !== 'default';

  const activeFilterCount = Object.entries(criteria).filter(([key, value]) => {
    if (value === '' || value === 'default') return false;
    // Distance only counts once a university is chosen (its select is hidden
    // otherwise), so a stray ?distance=1 deep link doesn't inflate the badge.
    if (key === 'distance' && !criteria.universityId) return false;
    return true;
  }).length;

  useEffect(() => {
    applyFilters();
  }, [criteria]);

  // Re-sync local filter state when the URL changes from outside this
  // component (browser back/forward, a link into /rent, etc.) so the sidebar
  // never shows stale filters that disagree with the address bar. Writes we
  // made ourselves in applyFilters are skipped to avoid a feedback loop.
  useEffect(() => {
    const currentUrl = buildSearchParams(criteria).toString();
    if (searchParams.toString() === currentUrl) return;
    setCriteria(parseSearchParams(searchParams));
  }, [searchParams]);

  return (
    <>
      <button
        className="filter-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open filters"
      >
        <span className="material-symbols-rounded">tune</span>
        Filters
        {hasActiveFilters && <span className="filter-badge">{activeFilterCount}</span>}
      </button>

      <aside className={`filter-sidebar${isOpen ? ' open' : ''}`} role="complementary" aria-label="Property filters">
        <div className="filter-sidebar-header">
          <h2 className="title-medium">Filters</h2>
          <button
            className="filter-close-btn icon-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close filters"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="filter-sidebar-content">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="filter-group">
              <label htmlFor="search-input" className="label-medium">Search</label>
              <input
                id="search-input"
                type="text"
                placeholder="Search by name or location..."
                value={criteria.query}
                onChange={handleSearch}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="location-select" className="label-medium">Location</label>
              <select
                id="location-select"
                value={criteria.location}
                onChange={handleLocationChange}
                className="filter-select"
              >
                <option value="">All locations</option>
                {districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <legend className="label-medium" style={{ padding: 0 }}>Price Range (per month)</legend>
              <div className="price-range-inputs">
                <div className="price-input-wrapper">
                  <span className="price-input-label">Min</span>
                  <input
                    id="min-price-input"
                    type="number"
                    aria-label="Minimum price per month"
                    placeholder={priceRange.min}
                    min={priceRange.min}
                    max={priceRange.max}
                    step={1}
                    value={criteria.minPrice !== '' ? criteria.minPrice : ''}
                    onChange={handleMinPriceChange}
                    className="filter-input"
                  />
                </div>
                <div className="price-input-wrapper">
                  <span className="price-input-label">Max</span>
                  <input
                    id="max-price-input"
                    type="number"
                    aria-label="Maximum price per month"
                    placeholder={priceRange.max}
                    min={priceRange.min}
                    max={priceRange.max}
                    step={1}
                    value={criteria.maxPrice !== '' ? criteria.maxPrice : ''}
                    onChange={handleMaxPriceChange}
                    className="filter-input"
                  />
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="beds-select" className="label-medium">Bedrooms</label>
              <select
                id="beds-select"
                value={criteria.beds !== '' ? criteria.beds : ''}
                onChange={handleBedsChange}
                className="filter-select"
              >
                <option value="">Any</option>
                <option value={1}>1 Bed</option>
                <option value={2}>2 Beds</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="university-select" className="label-medium">My University</label>
              <select
                id="university-select"
                value={criteria.universityId}
                onChange={handleUniversityChange}
                className="filter-select"
              >
                <option value="">Any university</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.short_name ? `${uni.short_name} — ${uni.name}` : uni.name}
                  </option>
                ))}
              </select>
            </div>

            {criteria.universityId !== '' && (
              <div className="filter-group">
                <label htmlFor="distance-select" className="label-medium">Distance From Campus</label>
                <select
                  id="distance-select"
                  value={criteria.distance}
                  onChange={handleDistanceChange}
                  className="filter-select"
                >
                  <option value="">Any distance</option>
                  <option value={1}>Within 1 km</option>
                  <option value={2}>Within 2 km</option>
                  <option value={3}>Within 3 km</option>
                  <option value={5}>Within 5 km</option>
                </select>
              </div>
            )}

            <div className="filter-group">
              <label htmlFor="sort-select" className="label-medium">Sort By</label>
              <select
                id="sort-select"
                value={criteria.sort}
                onChange={handleSortChange}
                className="filter-select"
              >
                <option value="default">Default</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            <div className="filter-actions">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={clearFilters}
                >
                  Clear All
                </button>
              )}
            </div>
          </form>
        </div>
      </aside>

      <div
        className={`filter-overlay${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}