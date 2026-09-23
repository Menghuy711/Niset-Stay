import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styleCssUrl from '../assets/css/style.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import FeatureSections from '../components/FeatureSection.jsx';
import StorySection from '../components/StorySection.jsx';
import { api, imageUrl } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import heroImg from '../assets/images/hero.png';
import bgPattern from '../assets/images/bg-pattern.png';

export default function Home() {
  const cssReady = usePageStylesheet(styleCssUrl);
  const { role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchFeaturedRooms = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/api/rooms?limit=8'); // Show only 8 featured rooms on home page
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
          alt: room.title
        }));
        setProperties(mappedProperties);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load rooms:', err);
        setError(err.message || 'Failed to load featured rooms.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFeaturedRooms();
    return () => { mounted = false; };
  }, []);

  if (!cssReady) return <PageLoader />;

  const propertyListClass = 'property-list' + (loading || error ? ' is-none' : '');

  return (
    <>
      <Header activePage="/" />

      <main>
        <article>
          {/* #HERO */}
          <section className="hero">
            <div className="container">
              <div className="hero-content">
                <h1 className="headline-large hero-title">More than a room it&rsquo;s where your future begins.</h1>

                <p className="body-large hero-text">
                  If you're looking for a place where you can be yourself, don't give up. Keep searching until you find a
                  place that feels like home.
                </p>
              </div>

              <img src={heroImg} width="816" height="659" role="presentation" className="hero-banner" alt="" />
              <img src={bgPattern} width="1240" height="840" role="presentation" className="bg-pattern" alt="" />
            </div>
          </section>

          {/* #PROPERTY SECTION */}
          {!['landlord', 'admin', 'super_admin'].includes(role) && (
          <section className="section property" aria-labelledby="property-label">
            <div className="container">
              <div className="title-wrapper">
                <div>
                  <h2 className="section-title headline-small" id="property-label">Stay where the comfort is.</h2>

                  <p className="section-text body-large">
                    Escape the campus rush. Niset Stay gives university students a quiet, comfortable sanctuary to come
                    home to. Study hard, sleep better, and enjoy a space that&rsquo;s truly yours.
                  </p>
                </div>

                <Link className="btn btn-outline" to="/rent">
                  <span className="label-medium">Explore more</span>
                  <span className="material-symbols-rounded" aria-hidden="true">arrow_outward</span>
                </Link>
              </div>

              <div className={propertyListClass}>
                {loading ? (
                  <div className="empty-state">
                    <span className="material-symbols-rounded" aria-hidden="true">hourglass_empty</span>
                    <p>Loading featured rooms...</p>
                  </div>
                ) : error ? (
                  <div className="empty-state">
                    <span className="material-symbols-rounded" aria-hidden="true">wifi_off</span>
                    <p>{error}</p>
                    <Link className="btn btn-outline" to="/rent">
                      <span className="label-medium">Browse available rooms</span>
                    </Link>
                  </div>
                ) : properties.length > 0 ? (
                  properties.map((property) => (
                    <PropertyCard key={property.link} {...property} />
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="material-symbols-rounded" aria-hidden="true">search_off</span>
                    <p>No rooms available at the moment</p>
                  </div>
                )}
              </div>
            </div>
          </section>
          )}

          <FeatureSections variant="home" />
          <StorySection />
        </article>
      </main>

      <Footer />
    </>
  );
}
