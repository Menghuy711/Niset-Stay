import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import BookingModal from './BookingModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useDialog from '../hooks/useDialog.js';
import { resolveImage } from '../lib/images.js';

function amenityIcon(amenity) {
  const map = {
    'Air Conditioner': 'fa-snowflake',
    'WiFi': 'fa-wifi',
    'Parking': 'fa-car',
    'Kitchen': 'fa-utensils',
    'Balcony': 'fa-sun',
    'Security': 'fa-shield-halved',
    '24/7 Security': 'fa-shield-halved',
    'Fully Furnished': 'fa-couch',
    'Water Supply': 'fa-faucet',
    'Elevator': 'fa-elevator',
    'Pet Friendly': 'fa-paw',
    'Gym': 'fa-dumbbell',
    'Laundry': 'fa-shirt',
  };
  return map[amenity] || 'fa-circle-check';
}

function shareLink(network, url) {
  const u = encodeURIComponent(url);
  switch (network) {
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'twitter': return `https://twitter.com/intent/tweet?url=${u}`;
    case 'telegram': return `https://t.me/share/url?url=${u}`;
    case 'whatsapp': return `https://wa.me/?text=${u}`;
    default: return '#';
  }
}

const FAVORITES_KEY = 'niset_favorites';

function readFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* localStorage unavailable / full — favorites persist for this tab only */
  }
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
  const lightboxRef = useRef(null);

  // Restore the favorite state for this room from localStorage.
  useEffect(() => {
    if (data?.id == null) return;
    setLiked(readFavorites().includes(data.id));
  }, [data?.id]);

  const toggleLike = () => {
    if (data?.id == null) return;
    setLiked((v) => {
      const next = !v;
      const favs = readFavorites().filter((x) => x !== data.id);
      writeFavorites(next ? [...favs, data.id] : favs);
      return next;
    });
  };

  const isStudent = user && user.role === 'student';

  const handleBookNowClick = () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!isStudent) return;
    setBookingModalOpen(true);
  };

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const nextImage = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prevImage = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  useDialog({ open: lightboxOpen, onClose: closeLightbox, dialogRef: lightboxRef });

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
      <div
        ref={lightboxRef}
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Room photo viewer"
        style={{ display: lightboxOpen ? 'block' : 'none' }}
        onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
      >
        <button type="button" className="lightbox-close" aria-label="Close lightbox" onClick={closeLightbox}>
          <i className="fa-solid fa-xmark" />
        </button>
        <button type="button" className="lightbox-prev" aria-label="Previous image" onClick={prevImage}>
          <i className="fa-solid fa-chevron-left" />
        </button>
        <img src={images[currentIndex]} alt="Full view screen" width="1020" height="680" />
        <button type="button" className="lightbox-next" aria-label="Next image" onClick={nextImage}>
          <i className="fa-solid fa-chevron-right" />
        </button>
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
                {data.badge && (
                  <span className="rd-badge rd-badge-hot"><i className="fa-solid fa-bolt" /> {data.badge}</span>
                )}
              </div>
              <h1 className="rd-title">{data.title}</h1>
              <div className="rd-meta-row">
                <span className="rd-meta-item"><i className="fa-regular fa-calendar" /> {data.date}</span>
                <span className="rd-meta-item"><i className="fa-solid fa-location-dot" /> {data.location}</span>
              </div>
            </div>
            <div className="rd-title-right">
              <h2 className="rd-price">
                {/^\$/.test(String(data.price)) ? (
                  <>{data.price}<span className="rd-price-period">/month</span></>
                ) : (
                  data.price
                )}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span className="rd-price-tag">Negotiable</span>
                {(!user || isStudent) && (
                  <button
                    type="button"
                    className="btn btn-fill"
                    style={{
                      paddingInline: '20px',
                      height: '42px',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(27, 97, 204, 0.4)',
                      cursor: 'pointer'
                    }}
                    onClick={handleBookNowClick}
                  >
                    <i className="fa-solid fa-calendar-check" /> Book Now
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Image Gallery */}
          <section className="rd-gallery">
            <div className="rd-gallery-main">
              <img src={images[0]} alt="Main room view" width="1020" height="680" onClick={() => openLightbox(0)} />
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
                  <img src={src} alt={`Room thumbnail ${i + 1}`} width="240" height="160" loading="lazy" />
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

                   {data.description && (
                     <p className="rd-desc-text">{data.description}</p>
                   )}

                   <div className="rd-details-grid">
                     <div className="rd-details-column">
                       <h4><i className="fa-solid fa-building" /> Property Details</h4>
                       <ul>
                         <li><i className="fa-solid fa-check" /> Bedrooms: {data.stats[0].value}</li>
                         <li><i className="fa-solid fa-check" /> Bathrooms: {data.stats[1].value}</li>
                         <li><i className="fa-solid fa-check" /> Area: {data.stats[3].value} m²</li>
                         {data.amenities && data.amenities.length > 0 ? (
                           data.amenities.map((a, i) => (
                             <li key={i}><i className="fa-solid fa-check" /> {a}</li>
                           ))
                         ) : (
                           <li><i className="fa-solid fa-check" /> Fully Furnished</li>
                         )}
                       </ul>
                     </div>
                     <div className="rd-details-column">
                       <h4><i className="fa-solid fa-file-contract" /> Rental Conditions</h4>
                       <ul>
                         <li><i className="fa-solid fa-check" /> Contract: {data.contractTerms || '1 Year'}</li>
                         <li><i className="fa-solid fa-check" /> Deposit: {data.depositTerms || '2 Months'}</li>
                         <li><i className={`fa-solid ${data.petPolicy && data.petPolicy.toLowerCase().includes('no') ? 'fa-xmark rd-icon-warn' : 'fa-check'}`} /> {data.petPolicy || 'No Pets Allowed'}</li>
                         <li><i className="fa-solid fa-bolt" /> {data.utilitiesTerms || 'Electricity Paid Separately'}</li>
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
                  {data.amenities && data.amenities.length > 0
                    ? data.amenities.map((amenity) => (
                        <span className="rd-amenity" key={amenity}>
                          <i className={`fa-solid ${amenityIcon(amenity)}`} /> {amenity}
                        </span>
                      ))
                    : (
                      <>
                        <span className="rd-amenity"><i className="fa-solid fa-snowflake" /> Air Conditioner</span>
                        <span className="rd-amenity"><i className="fa-solid fa-wifi" /> WiFi</span>
                        <span className="rd-amenity"><i className="fa-solid fa-car" /> Parking</span>
                        <span className="rd-amenity"><i className="fa-solid fa-utensils" /> Kitchen</span>
                        <span className="rd-amenity"><i className="fa-solid fa-sun" /> Balcony</span>
                        <span className="rd-amenity"><i className="fa-solid fa-shield-halved" /> Security</span>
                      </>
                    )}
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
                  <a className="rd-social-btn rd-social-fb" href={shareLink('facebook', window.location.href)} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><i className="fab fa-facebook-f" /></a>
                  <a className="rd-social-btn rd-social-tw" href={shareLink('twitter', window.location.href)} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><i className="fab fa-twitter" /></a>
                  <a className="rd-social-btn rd-social-te" href={shareLink('telegram', window.location.href)} target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram"><i className="fab fa-telegram" /></a>
                  <a className="rd-social-btn rd-social-wa" href={shareLink('whatsapp', window.location.href)} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"><i className="fab fa-whatsapp" /></a>
                </div>
                <button className={`rd-like-btn${liked ? ' active' : ''}`} onClick={toggleLike}>
                  <i className={liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
                  <span>{liked ? 'Saved to favorites' : 'Save to favorites'}</span>
                </button>
              </div>

              {/* Contact Form */}
              <div className="rd-sidebar-card rd-contact-card">
                <h4 className="rd-sidebar-title">Contact Owner</h4>
                <p className="rd-contact-subtitle">
                  For the fastest reply, call or email the owner from the Owner Information section above.
                </p>
                <form className="rd-contact-form" ref={formRef} onSubmit={handleContactSubmit}>
                  {submitted && (
                    <p className="rd-form-note">
                      <i className="fa-solid fa-circle-check" />
                      Thank you — to reach {data.ownerName || 'the owner'} directly, use the phone or email above.
                    </p>
                  )}
                  <label className="rd-input-label" htmlFor="rd-contact-name">Your Name</label>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-user" />
                    <input id="rd-contact-name" type="text" placeholder="e.g. Sokha" required />
                  </div>
                  <label className="rd-input-label" htmlFor="rd-contact-email">Email Address</label>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-envelope" />
                    <input id="rd-contact-email" type="email" placeholder="you@university.edu" required />
                  </div>
                  <label className="rd-input-label" htmlFor="rd-contact-phone">Phone Number</label>
                  <div className="rd-input-group">
                    <i className="fa-solid fa-phone" />
                    <input id="rd-contact-phone" type="tel" placeholder="+855 12 345 678" />
                  </div>
                  <label className="rd-input-label" htmlFor="rd-contact-message">Message</label>
                  <div className="rd-input-group rd-input-textarea">
                    <i className="fa-solid fa-message" />
                    <textarea id="rd-contact-message" rows="4" placeholder="Write your message..." />
                  </div>
                  <button type="submit" className="rd-submit-btn">
                    <i className="fa-solid fa-paper-plane" /> Send Message
                  </button>
                </form>
              </div>

              {/* More Rooms */}
              <div className="rd-sidebar-card">
                <h4 className="rd-sidebar-title">Explore More Rooms</h4>
                <div className="rd-filter-links">
                  <Link to="/rent" className="rd-filter-link active">
                    <i className="fa-solid fa-magnifying-glass" /> Browse all available rooms
                  </Link>
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
