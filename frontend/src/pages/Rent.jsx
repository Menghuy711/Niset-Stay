import rentCssUrl from '../assets/css/rent.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import FeatureSections from '../components/FeatureSection.jsx';
import StorySection from '../components/StorySection.jsx';
import FilterSidebar from '../components/FilterSidebar.jsx';
import { filterProperties, haversineKm } from '../utils/filterProperties.js';
import { useState, useEffect } from 'react';
import { api, imageUrl } from '../lib/api.js';
import rentHero from '../assets/images/banner-1.jpg';

export default function Rent() {
  const cssReady = usePageStylesheet(rentCssUrl);
  const [filterCriteria, setFilterCriteria] = useState({});
  const [properties, setProperties] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchRooms = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const data = await api.get('/api/rooms');
        if (!mounted) return;

        // Map database fields to PropertyCard format
        const mappedProperties = (data || []).map(room => ({
          image: imageUrl(room.image_url) || 'property-1.jpg',
          badge: room.badge || null,
          link: `/room/${room.id}`,
          title: room.title,
          address: room.address || 'Address TBA',
          price: room.price != null && room.price !== '' ? `$${room.price} per month` : 'Price on request',
          metas: [
            room.beds ? `${room.beds} Bed${room.beds > 1 ? 's' : ''}` : '1 Bed',
            room.baths ? `${room.baths} Bath${room.baths > 1 ? 's' : ''}` : '1 Bath',
            room.sqft ? `${room.sqft} sqft` : '1200 sqft'
          ],
          alt: room.title,
          // Keep raw values for filtering
          rawPrice: room.price,
          rawBeds: room.beds || 1,
          rawBaths: room.baths || 1,
          rawSqft: room.sqft || 1200,
          rawLatitude: room.latitude,
          rawLongitude: room.longitude
        }));
        setProperties(mappedProperties);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load rooms:', err);
        setFetchError(err?.message || 'Failed to load rooms. Please try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchUniversities = async () => {
      try {
        const data = await api.get('/api/universities');
        if (mounted) setUniversities(data || []);
      } catch (err) {
        console.error('Failed to load universities:', err);
      }
    };

    fetchRooms();
    fetchUniversities();
    return () => { mounted = false; };
  }, []);

  if (!cssReady) return <PageLoader />;

  const filteredProperties = filterProperties(properties, filterCriteria, universities);

  // Show "X km from <campus>" on cards when a university filter is active.
  const activeUniversity = universities.find(
    (u) => String(u.id) === String(filterCriteria.universityId)
  );
  const resultsWithDistance = activeUniversity
    ? filteredProperties.map((p) => {
        const km = haversineKm(activeUniversity.latitude, activeUniversity.longitude, p.rawLatitude, p.rawLongitude);
        if (km === null) return p;
        const label = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
        return { ...p, distanceLabel: `${label} from ${activeUniversity.short_name || activeUniversity.name}` };
      })
    : filteredProperties;

  const handleFilterChange = (criteria) => {
    setFilterCriteria(criteria);
  };

  return (
    <>
      <Header activePage="/rent" />

      <main>
        <article>
          <section aria-label="Rent a room banner" className="rent-hero" style={{ backgroundImage: `url(${rentHero})` }}>
            <div className="rent-hero-overlay" />
            <div className="rent-hero-content">
              <span className="rent-hero-badge">Rent a Room</span>
              <h1 className="rent-hero-title">Stay Where the Comfort <span>Is</span></h1>
              <p className="rent-hero-sub">
                Escape the campus rush. Niset Stay gives university students a quiet, comfortable sanctuary to call home.
              </p>
            </div>
          </section>

          <section className="section property">
            <div className="container">
              <div className="rent-layout">
                <FilterSidebar onFilterChange={handleFilterChange} properties={properties} universities={universities} />

                <div className="property-results">
                  <div className="results-header">
                    <p className="results-count body-medium">
                      {loading ? 'Loading...' : `${filteredProperties.length} ${filteredProperties.length === 1 ? 'room' : 'rooms'} found`}
                    </p>
                  </div>

                  <div className="property-list">
                    {loading ? (
                      <div className="no-results">
                        <span className="material-symbols-rounded">hourglass_empty</span>
                        <p className="body-large">Loading rooms...</p>
                      </div>
                    ) : fetchError ? (
                      <div className="no-results">
                        <span className="material-symbols-rounded">wifi_off</span>
                        <p className="body-large">Unable to load rooms</p>
                        <p className="body-medium">{fetchError}</p>
                      </div>
                    ) : filteredProperties.length > 0 ? (
                      resultsWithDistance.map((property) => (
                        <PropertyCard key={property.link} {...property} />
                      ))
                    ) : (
                      <div className="no-results">
                        <span className="material-symbols-rounded">search_off</span>
                        <p className="body-large">No rooms match your filters</p>
                        <p className="body-medium">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <FeatureSections variant="rent" />
          <StorySection />
        </article>
      </main>

      <Footer />
    </>
  );
}
