import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import myBookingsCssUrl from '../assets/css/my-bookings.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InvoiceModal from '../components/InvoiceModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { resolveImage } from '../lib/images';

function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyBookings() {
  usePageStylesheet(myBookingsCssUrl);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    // Only redirect after auth has finished loading
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    async function fetchBookings() {
      try {
        setLoading(true);
        const data = await api.get('/api/bookings/my');
        setBookings(data || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (err.status === 401) {
          setError('Your session has expired. Please sign in again.');
        } else {
          setError(err.message || 'Failed to load bookings.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [user]);

  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'confirmed') {
      return (
        <span className="mb-status-badge mb-status-confirmed">
          <i className="fa-solid fa-circle-check" /> Confirmed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="mb-status-badge mb-status-cancelled">
          <i className="fa-solid fa-circle-xmark" /> Cancelled
        </span>
      );
    }
    return (
      <span className="mb-status-badge mb-status-pending">
        <i className="fa-solid fa-clock" /> Pending Review
      </span>
    );
  };

  return (
    <>
      <Header activePage="/my-bookings" />

      <main className="mb-page">
        <div className="mb-container">
<header className="mb-header">
              <span className="mb-badge">
                <i className="fa-solid fa-list-check" /> My Account
              </span>
              <h1 className="mb-title">My Bookings</h1>
              <p className="mb-subtitle">View and manage your student rental reservations</p>
            </header>

            {!loading && !error && (
              <section className="mb-stats" aria-label="Booking summary">
                <div className="mb-stat">
                  <span className="mb-stat-icon"><i className="fa-solid fa-layer-group" /></span>
                  <div>
                    <strong className="mb-stat-value">{bookings.length}</strong>
                    <span className="mb-stat-label">Total Bookings</span>
                  </div>
                </div>
                <div className="mb-stat">
                  <span className="mb-stat-icon mb-stat-icon-pending"><i className="fa-regular fa-clock" /></span>
                  <div>
                    <strong className="mb-stat-value">
                      {bookings.filter((b) => (b.status || 'pending').toLowerCase() === 'pending').length}
                    </strong>
                    <span className="mb-stat-label">Pending</span>
                  </div>
                </div>
                <div className="mb-stat">
                  <span className="mb-stat-icon mb-stat-icon-confirmed"><i className="fa-solid fa-circle-check" /></span>
                  <div>
                    <strong className="mb-stat-value">
                      {bookings.filter((b) => (b.status || 'pending').toLowerCase() === 'confirmed').length}
                    </strong>
                    <span className="mb-stat-label">Confirmed</span>
                  </div>
                </div>
              </section>
            )}

          {loading || authLoading ? (
            <div className="mb-loading">
              <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--primary-100)' }} />
              <p style={{ marginTop: '12px', fontSize: '1.5rem', color: 'var(--neutral-40)' }}>
                Loading your bookings...
              </p>
            </div>
          ) : error ? (
            <div className="mb-empty">
              <div className="mb-empty-icon" style={{ backgroundColor: '#FEF2F2', color: '#FF2134' }}>
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h2 className="mb-empty-title">Couldn't Load Bookings</h2>
              <p className="mb-empty-desc">{error}</p>
              <Link to="/rent" className="btn btn-fill" style={{ display: 'inline-flex' }}>
                Browse Available Rooms
              </Link>
            </div>
          ) : bookings.length === 0 ? (
            <div className="mb-empty">
              <div className="mb-empty-icon">
                <i className="fa-solid fa-calendar-xmark" />
              </div>
              <h2 className="mb-empty-title">No Bookings Yet</h2>
              <p className="mb-empty-desc">
                You haven't reserved any room yet. Browse our verified student housing and submit a reservation!
              </p>
              <Link to="/rent" className="btn btn-fill" style={{ display: 'inline-flex' }}>
                <i className="fa-solid fa-magnifying-glass" /> Browse Rooms
              </Link>
            </div>
          ) : (
            <div className="mb-grid">
              {bookings.map((booking) => (
                <div key={booking.id} className="mb-card">
                  <div className="mb-card-main">
                    <img
                      src={resolveImage(booking.room_image, { fallbackToFirst: true, passthroughUnknown: true })}
                      alt={booking.room_title}
                      className="mb-card-img"
                      width="320"
                      height="213"
                      loading="lazy"
                    />
                    <div className="mb-card-details">
                      <h2 className="mb-card-title">{booking.room_title}</h2>
                      <span className="mb-card-price">{booking.room_price || 'Negotiable'} / month</span>
                      <div className="mb-card-meta">
                        <span className="mb-card-meta-item">
                          <i className="fa-regular fa-calendar-days" /> Move-in: {formatDate(booking.move_in)}
                        </span>
                        <span className="mb-card-meta-item">
                          <i className="fa-solid fa-users" /> {booking.occupants ?? 1} Occupant{(booking.occupants ?? 1) > 1 ? 's' : ''}
                        </span>
                        <span className="mb-card-meta-item">
                          <i className="fa-solid fa-phone" /> {booking.phone || 'No phone'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-card-side">
                    {renderStatusBadge(booking.status)}
                    <span className="mb-created-date">
                      Requested: {formatDate(booking.created_at)}
                    </span>
                    <button
                      type="button"
                      className="mb-view-inv-btn"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <i className="fa-solid fa-file-invoice" /> View Invoice &amp; Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <InvoiceModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </>
  );
}
