import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styleCssUrl from '../assets/css/style.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import FeatureSections from '../components/FeatureSection.jsx';
import StorySection from '../components/StorySection.jsx';
import { supabase } from '../lib/supabaseClient.js';
import heroImg from '../assets/images/hero.png';
import bgPattern from '../assets/images/bg-pattern.png';

export default function Home() {
  usePageStylesheet(styleCssUrl);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8); // Show only 8 featured rooms on home page

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
          alt: room.title
        }));
        setProperties(mappedProperties);
      }
      setLoading(false);
    };

    fetchFeaturedRooms();
  }, []);

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

                <Link className="btn btn-outline" to="/rent">
                  <span className="label-medium">Explore more</span>
                  <span className="material-symbols-rounded" aria-hidden="true">arrow_outward</span>
                </Link>
              </div>

              <div className="property-list">
                {loading ? (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    padding: '40px',
                    fontSize: '1.6rem',
                    color: '#666'
                  }}>
                    Loading featured properties...
                  </div>
                ) : properties.length > 0 ? (
                  properties.map((property) => (
                    <PropertyCard key={property.link} {...property} />
                  ))
                ) : (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    padding: '40px',
                    fontSize: '1.6rem',
                    color: '#666'
                  }}>
                    No properties available at the moment
                  </div>
                )}
              </div>
            </div>
          </section>

          <FeatureSections />
          <StorySection />
        </article>
      </main>

      <Footer />
    </>
  );
}
