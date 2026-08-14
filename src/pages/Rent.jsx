import rentCssUrl from '../assets/css/rent.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import FeatureSections from '../components/FeatureSection.jsx';
import StorySection from '../components/StorySection.jsx';
import FilterSidebar from '../components/FilterSidebar.jsx';
import { filterProperties } from '../utils/filterProperties.js';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function Rent() {
  usePageStylesheet(rentCssUrl);
  const [filterCriteria, setFilterCriteria] = useState({});
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map database fields to PropertyCard format
        const mappedProperties = data.map(room => ({
          image: room.image_url || 'property-1.jpg',
          badge: room.badge || null,
          link: `/room/${room.id}`,
          title: room.title,
          address: room.address || 'Address TBA',
          price: `$${room.price} per month`,
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
          category: room.category
        }));
        setProperties(mappedProperties);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  const filteredProperties = filterProperties(properties, filterCriteria);

  const handleFilterChange = (criteria) => {
    setFilterCriteria(criteria);
  };

  return (
    <>
      <Header activePage="/rent" />

      <main>
        <article>
          <section className="section property" aria-labelledby="property-label">
            <div className="container">
              <div className="title-wrapper">
                <div>
                  <h2 className="section-title headline-small">Stay where the comfort is.</h2>

                  <p className="section-text body-large">
                    Escape the campus rush. Niset Stay gives university students a quiet, comfortable sanctuary to come
                    home to. Study hard, sleep better, and enjoy a space that&rsquo;s truly yours.
                  </p>
                </div>
              </div>

              <div className="rent-layout">
                <FilterSidebar onFilterChange={handleFilterChange} />

                <div className="property-results">
                  <div className="results-header">
                    <p className="results-count body-medium">
                      {loading ? 'Loading...' : `${filteredProperties.length} ${filteredProperties.length === 1 ? 'property' : 'properties'} found`}
                    </p>
                  </div>

                  <div className="property-list">
                    {loading ? (
                      <div className="no-results">
                        <span className="material-symbols-rounded">hourglass_empty</span>
                        <p className="body-large">Loading properties...</p>
                      </div>
                    ) : filteredProperties.length > 0 ? (
                      filteredProperties.map((property, i) => (
                        <PropertyCard key={property.link + i} {...property} />
                      ))
                    ) : (
                      <div className="no-results">
                        <span className="material-symbols-rounded">search_off</span>
                        <p className="body-large">No properties match your filters</p>
                        <p className="body-medium">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <FeatureSections />
          <StorySection showViewAll />
        </article>
      </main>

      <Footer />
    </>
  );
}
