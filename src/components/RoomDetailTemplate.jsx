import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import BookingModal from './BookingModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const propertyImages = import.meta.glob('../assets/images/property-*.jpg', {
  eager: true,
  import: 'default',
});

function resolveImage(filename) {
  if (!filename) return '';
  if (/^(https?:|blob:|data:|file:)/.test(filename)) return filename;
  const match = Object.entries(propertyImages).find(([path]) => path.endsWith(`/${filename}`));
  return match ? match[1] : '';
}

export default function RoomDetailTemplate({ data }) {
  const images = [data.mainImage, ...data.thumbImages].map(resolveImage);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitTimeoutRef = useRef(null);
  const formRef = useRef(null);

  const handleBookNowClick = () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    setBookingModalOpen(true);
  };

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const nextImage = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prevImage = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, images.length]);

  useEffect(() => () => clearTimeout(submitTimeoutRef.current), []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    submitTimeoutRef.current = setTimeout(() => {
      setSubmitted(false);
      formRef.current?.reset();
    }, 2500);
  };

  return (
    <>
      <Header activePage="/rent" />

      {/* Lightbox Overlay */}
      <div className="lightbox" style={{ display: lightboxOpen ? 'block' : 'none' }} onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}>
        <span className="lightbox-close" aria-label="Close lightbox" onClick={closeLightbox}>
          <i className="fa-solid fa-xmark" />
        </span>
        <span className="lightbox-prev" aria-label="Previous image" onClick={prevImage}>
          <i className="fa-solid fa-chevron-left" />
        </span>
        <img src={images[currentIndex]} alt="Full view screen" />
        <span className="lightbox-next" aria-label="Next image" onClick={nextImage}>
          <i className="fa-solid fa-chevron-right" />
        </span>
        <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
      </div>

      <main className="room-detail-page">
        <div className="rd-container">
          {/* Breadcrumb */}
          <nav className="rd-breadcrumb" aria-label="Breadcrumb">
            <Link to="/"><i className="fa-solid fa-house" /> Home</Link>
            <span className="rd-breadcrumb-sep"><i className="fa-solid fa-chevron-right" /></span>
            <Link to="/rent">Rent</Link>
            <span className="rd-breadcrumb-sep"><i className="fa-solid fa-chevron-right" /></span>
            <span className="rd-breadcrumb-current">{data.breadcrumbCurrent}</span>
          </nav>

          {/* Title Section */}
          <section className="rd-title-section">
            <div className="rd-title-left">
              <div className="rd-badge-row">
                <span className="rd-badge rd-badge-rent"><i className="fa-solid fa-tag" /> Room for Rent</span>
                <span className="rd-badge rd-badge-hot"><i className="fa-solid fa-fire" /> Hot</span>
              </div>
              <h1 className="rd-title">{data.title}</h1>
              <div className="rd-meta-row">
                <span className="rd-meta-item"><i className="fa-regular fa-calendar" /> {data.date}</span>
                <span className="rd-meta-item"><i className="fa-solid fa-fingerprint" /> {data.refId}</span>
                <span className="rd-meta-item"><i className="fa-solid fa-location-dot" /> {data.location}</span>
              </div>
            </div>
            <div className="rd-title-right">
              <span className="rd-price-label">Monthly Rent</span>
              <h2 className="rd-price">{data.price}<span className="rd-price-period">/month</span></h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span className="rd-price-tag">Negotiable</span>
                <button
                  type="button"
                  className="btn btn-fill"
                  style={{
                    paddingInline: '20px',
                    height: '42px',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(33, 121, 255, 0.4)',
                    cursor: 'pointer'
                  }}
                  onClick={handleBookNowClick}
                >
                  <i className="fa-solid fa-calendar-check" /> Book Now
                </button>
              </div>
            </div>
          </section>

          {/* Image Gallery */}
          <section className="rd-gallery">
            <div className="rd-gallery-main">
              <img src={images[0]} alt="Main room view" onClick={() => openLightbox(0)} />
              <div className="rd-gallery-main-overlay">
                <i className="fa-solid fa-expand" /> Click to enlarge
              </div>
            </div>
            <div className="rd-gallery-grid">
              {images.slice(1).map((src, i) => (
                <div
                  className={`rd-gallery-thumb${i === images.length - 2 ? ' rd-gallery-thumb-last' : ''}`}
                  key={src}
                  onClick={() => openLightbox(i + 1)}
                >
                  <img src={src} alt={`Room thumbnail ${i + 1}`} />
                  {i === images.length - 2 && (
                    <div className="rd-thumb-overlay">
                      <i className="fa-solid fa-images" />
                      <span>View All</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Content Area */}
          <div className="rd-content">
            {/* Left Column */}
            <div className="rd-content-main">
              {/* Overview Stats */}
              <section className="rd-card rd-overview">
                <h3 className="rd-card-title"><i className="fa-solid fa-chart-simple" /> Overview</h3>
                <div className="rd-stats-grid">
                  {[
                    { icon: 'fa-bed', ...data.stats[0] },
                    { icon: 'fa-bath', ...data.stats[1] },
                    { icon: 'fa-warehouse', ...data.stats[2] },
                    { icon: 'fa-ruler-combined', ...data.stats[3] },
                  ].map((stat) => (
                    <div className="rd-stat-item" key={stat.label}>
                      <div className="rd-stat-icon"><i className={`fa-solid ${stat.icon}`} /></div>
                      <div className="rd-stat-info">
                        <span className="rd-stat-value">{stat.value}</span>
                        <span className="rd-stat-label">{stat.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

               {/* Description */}
               <section className="rd-card">
                 <h3 className="rd-card-title"><i className="fa-solid fa-align-left" /> Description</h3>
                 <div className="rd-description">
                   <p><strong><i className="fa-solid fa-fire" style={{ color: '#ff4e31', marginRight: '5px' }} /> {data.descriptionTitle}</strong></p>
                   <p className="rd-desc-price">Rental Price: <strong>{data.descriptionPrice}</strong> <em>(Negotiable)</em></p>

                   <div className="rd-details-grid">
                     <div className="rd-details-column">
                       <h4><i className="fa-solid fa-building" /> Property Details</h4>
                       <ul>
                         <li><i className="fa-solid fa-check" /> House Size: 4m × 4m</li>
                         <li><i className="fa-solid fa-check" /> Land Size: 4m × 4m</li>
                         <li><i className="fa-solid fa-check" /> Bedrooms: 1</li>
                         <li><i className="fa-solid fa-check" /> Bathrooms: 1</li>
                         <li><i className="fa-solid fa-check" /> Fully Furnished</li>
                         <li><i className="fa-solid fa-check" /> Air Conditioner</li>
                         <li><i className="fa-solid fa-check" /> Free WiFi</li>
                         <li><i className="fa-solid fa-check" /> Water Supply Included</li>
                         <li><i className="fa-solid fa-check" /> Parking Available</li>
                         <li><i className="fa-solid fa-check" /> 24/7 Security</li>
                       </ul>
                     </div>
                     <div className="rd-details-column">
                       <h4><i className="fa-solid fa-file-contract" /> Rental Conditions</h4>
                       <ul>
                         <li><i className="fa-solid fa-check" /> Contract: 1 Year</li>
                         <li><i className="fa-solid fa-check" /> Deposit: 2 Months</li>
                         <li><i className="fa-solid fa-xmark rd-icon-warn" /> No Pets Allowed</li>
                         <li><i className="fa-solid fa-bolt" /> Electricity Paid Separately</li>
                       </ul>
                     </div>
                   </div>
                 </div>
               </section>

               {/* Owner Contact Information */}
               <section className="rd-card">
                 <h3 className="rd-card-title"><i className="fa-solid fa-user-tie" /> Owner Information</h3>
                 <div className="rd-owner-info">
                   <div className="rd-owner-header">
                     <div className="rd-owner-avatar">
                       <i className="fa-solid fa-user" />
                     </div>
                     <div className="rd-owner-details">
                       <h4 className="rd-owner-name">{data.ownerName}</h4>
                       <p className="rd-owner-label">Room Owner</p>
                     </div>
                   </div>

                    <div className="rd-owner-contacts">
                      {data.ownerPhone && (
                        <div className="rd-owner-contact-item">
                          <i className="fa-solid fa-phone" />
                          <div>
                            <span className="rd-contact-label">Phone</span>
                            <a href={`tel:${data.ownerPhone}`} className="rd-contact-value">{data.ownerPhone}</a>
                          </div>
                        </div>
                      )}
                      {data.ownerEmail && (
                        <div className="rd-owner-contact-item">
                          <i className="fa-solid fa-envelope" />
                          <div>
                            <span className="rd-contact-label">Email</span>
                            <a href={`mailto:${data.ownerEmail}`} className="rd-contact-value">{data.ownerEmail}</a>
                          </div>
                        </div>
                      )}
                      {data.ownerTelegram && (
                        <div className="rd-owner-contact-item">
                          <i className="fab fa-telegram" />
                          <div>
                            <span className="rd-contact-label">Telegram</span>
                            <a href={data.ownerTelegram} target="_blank" rel="noopener noreferrer" className="rd-contact-value">
                              Message on Telegram <i className="fa-solid fa-external-link-alt" style={{ fontSize: '0.9em', marginLeft: '4px' }} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               </section>

              {/* Amenities */}
              <section className="rd-card">
                <h3 className="rd-card-title"><i className="fa-solid fa-star" /> Amenities</h3>
                <div className="rd-amenities">
                  <span className="rd-amenity"><i className="fa-solid fa-snowflake" /> Air Conditioner</span>
                  <span className="rd-amenity"><i className="fa-solid fa-wifi" /> WiFi</span>
                  <span className="rd-amenity"><i className="fa-solid fa-car" /> Parking</span>
                  <span className="rd-amenity"><i className="fa-solid fa-utensils" /> Kitchen</span>
                  <span className="rd-amenity"><i className="fa-solid fa-sun" /> Balcony</span>
                  <span className="rd-amenity"><i className="fa-solid fa-shield-halved" /> Security</span>
                </div>
              </section>

              {/* Map */}
              <section className="rd-card">
                <h3 className="rd-card-title"><i className="fa-solid fa-map-location-dot" /> Location</h3>
                <div className="rd-map-wrapper">
                  <iframe
                    width="100%"
                    height="350"
                    style={{ border: 0, borderRadius: '12px' }}
                    loading="lazy"
                    allowFullScreen
                    title="Room location"
                    src={`https://maps.google.com/maps?q=${data.mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              </section>
            </div>

            {/* Right Sidebar */}
            <aside className="rd-sidebar">
              {/* Share & Save */}
              <div className="rd-sidebar-card rd-share-card">
                <h4 className="rd-sidebar-title">Share &amp; Save</h4>
                <div className="rd-social-row">
                  <a className="rd-social-btn rd-social-fb" aria-label="Share on Facebook"><i className="fab fa-facebook-f" /></a>
                  <a className="rd-social-btn rd-social-tw" aria-label="Share on Twitter"><i className="fab fa-twitter" /></a>
                  <a className="rd-social-btn rd-social-in" aria-label="Share on LinkedIn"><i className="fab fa-linkedin-in" /></a>
                  <a className="rd-social-btn rd-social-te" aria-label="Share on Telegram"><i className="fab fa-telegram" /></a>
                  <a className="rd-social-btn rd-social-wa" aria-label="Share on WhatsApp"><i className="fab fa-whatsapp" /></a>
                </div>
                <button className={`rd-like-btn${liked ? ' active' : ''}`} onClick={() => setLiked((v) => !v)}>
                  <i className={liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
                  <span>{liked ? 'Saved!' : 'Save to Favorites'}</span>
                </button>
              </div>

              {/* Contact Form */}
              <div className="rd-sidebar-card rd-contact-card">
                <h4 className="rd-sidebar-title">Contact Owner</h4>
                <p className="rd-contact-subtitle">Interested? Send a message directly.</p>
                <form className="rd-contact-form" ref={formRef} onSubmit={handleContactSubmit}>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-user" />
                    <input type="text" placeholder="Your Name" required />
                  </div>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-envelope" />
                    <input type="email" placeholder="Email Address" required />
                  </div>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-phone" />
                    <input type="tel" placeholder="Phone Number" />
                  </div>
                  <div className="rd-input-group rd-input-textarea">
                    <i className="fa-solid fa-message" />
                    <textarea rows="4" placeholder="Write your message..." />
                  </div>
                  <button
                    type="submit"
                    className="rd-submit-btn"
                    style={submitted ? { background: 'linear-gradient(135deg, #10B981, #059669)' } : undefined}
                  >
                    {submitted ? (
                      <><i className="fa-solid fa-check" /> Message Sent!</>
                    ) : (
                      <><i className="fa-solid fa-paper-plane" /> Send Message</>
                    )}
                  </button>
                </form>
              </div>

              {/* Filter Links */}
              <div className="rd-sidebar-card">
                <h4 className="rd-sidebar-title">Browse by Type</h4>
                <div className="rd-filter-links">
                  <Link to="/rent" className="rd-filter-link active">All</Link>
                  <Link to="/rent" className="rd-filter-link">Rent</Link>
                  <Link to="/rent" className="rd-filter-link">Sale</Link>
                  <Link to="/rent" className="rd-filter-link rd-filter-hot"><i className="fa-solid fa-fire" /> Hot</Link>
                </div>
              </div>

              <div className="rd-sidebar-card">
                <h4 className="rd-sidebar-title">Status</h4>
                <div className="rd-filter-links">
                  <Link to="/rent" className="rd-filter-link active">All</Link>
                  <Link to="/rent" className="rd-filter-link">Sold</Link>
                  <Link to="/rent" className="rd-filter-link">Rented</Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        roomData={{
          ...data,
          resolvedImage: images[0]
        }}
      />
    </>
  );
}
