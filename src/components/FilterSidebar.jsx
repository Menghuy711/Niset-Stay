import { useState, useEffect, useCallback } from 'react';
import { filterProperties, getUniqueDistricts, getPriceRange, parseSearchParams, buildSearchParams } from '../utils/filterProperties.js';
import { useSearchParams, useNavigate } from 'react-router-dom';
import rentProperties from '../data/rentProperties.js';

export default function FilterSidebar({ onFilterChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const districts = getUniqueDistricts(rentProperties);
  const priceRange = getPriceRange(rentProperties);

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
      sort: 'default'
    };
    setCriteria(cleared);
    setSearchParams(new URLSearchParams(), { replace: true });
    onFilterChange?.(cleared);
  }, [setSearchParams, onFilterChange]);

  const hasActiveFilters = criteria.query || criteria.location || criteria.minPrice !== '' || criteria.maxPrice !== '' || criteria.beds !== '' || criteria.sort !== 'default';

  useEffect(() => {
    applyFilters();
  }, [criteria]);

  const filteredProperties = filterProperties(rentProperties, criteria);

  return (
    <>
      <button
        className="filter-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open filters"
      >
        <span className="material-symbols-rounded">tune</span>
        Filters
        {hasActiveFilters && <span className="filter-badge">{Object.values(criteria).filter(v => v !== '' && v !== 'default').length}</span>}
      </button>

      <aside className={`filter-sidebar${isOpen ? ' open' : ''}`} role="complementary" aria-label="Property filters">
        <div className="filter-sidebar-header">
          <h3 className="title-medium">Filters</h3>
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
              <label className="label-medium">Price Range (per month)</label>
              <div className="price-range-inputs">
                <div className="price-input-wrapper">
                  <span className="price-input-label">Min</span>
                  <input
                    type="number"
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
                    type="number"
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