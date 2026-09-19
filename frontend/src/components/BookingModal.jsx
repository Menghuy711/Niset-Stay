import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import useDialog from '../hooks/useDialog';
import '../assets/css/booking-modal.css';

export default function BookingModal({ isOpen, onClose, roomData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  useDialog({ open: isOpen && !!roomData, onClose, dialogRef: modalRef });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupants, setOccupants] = useState(1);
  const [moveIn, setMoveIn] = useState('');
  // Minimum selectable move-in date, refreshed each time the modal opens so a
  // modal left open across midnight doesn't show a stale, already-passed day.
  const [minDate, setMinDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [bookingCheckLoading, setBookingCheckLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const name = user.full_name || user.email || '';
      setFullName(name);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !roomData) return;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // Reset submission state each time the modal opens so a previous booking's
    // success/error doesn't leak into a new booking attempt (the modal stays
    // mounted and only renders null when closed).
    setMinDate(todayStr);
    setIsSuccess(false);
    setError('');
    setMoveIn(todayStr);
  }, [isOpen, roomData]);

  // Hide the form if this user already has a pending/confirmed booking for the
  // room, matching the backend guard and the DB unique index on active_slot.
  useEffect(() => {
    if (!isOpen || !roomData) return;
    if (!user) {
      setHasActiveBooking(false);
      setBookingCheckLoading(false);
      return;
    }
    let cancelled = false;
    setBookingCheckLoading(true);
    const checkExistingBooking = async () => {
      try {
        const bookings = await api.get('/api/bookings/my');
        if (cancelled) return;
        const exists = (bookings ?? []).some(
          (b) => b.room_id === roomData.id && ['pending', 'confirmed'].includes(b.status)
        );
        setHasActiveBooking(exists);
      } catch {
        if (!cancelled) setHasActiveBooking(false);
      } finally {
        if (!cancelled) setBookingCheckLoading(false);
      }
    };
    checkExistingBooking();
    return () => {
      cancelled = true;
    };
  }, [isOpen, roomData, user]);

  if (!isOpen || !roomData) return null;

  const isStudent = user && user.role === 'student';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!isStudent) {
      setError('Only students can book rooms.');
      return;
    }

    if (!roomData.id) {
      setError("This room can't be booked right now. Please go back and try again.");
      return;
    }

    if (!phone.trim()) {
      setError('Please provide a valid phone number.');
      return;
    }
    if (!/^\+?[0-9][0-9\s().-]{5,19}$/.test(phone.trim())) {
      setError('Please enter a valid phone number (digits, spaces and + allowed).');
      return;
    }
    if (!moveIn) {
      setError('Please choose a move-in date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newBooking = {
        room_id: roomData.id,
        room_title: roomData.title || 'Student Room',
        room_image: roomData.mainImage || '',
        room_price: roomData.price || '',
        full_name: fullName,
        phone: phone,
        occupants: parseInt(occupants, 10),
        move_in: moveIn ? `${moveIn}T00:00:00` : null,
      };

      // user_id comes from the JWT on the backend
      await api.post('/api/bookings', newBooking);
      setIsSuccess(true);
    } catch (err) {
      console.error('Booking submission error:', err);
      if (err.status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.message || 'Failed to submit booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToBookings = () => {
    onClose();
    navigate('/my-bookings');
  };

  return (
    <div className="bm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} className="bm-modal" role="dialog" aria-modal="true" aria-labelledby="bm-modal-title">
        <div className="bm-header">
          <button className="bm-close-btn" onClick={onClose} aria-label="Close modal">
            <i className="material-symbols-rounded" aria-hidden="true" >close</i>
          </button>
          <span className="bm-title-badge">
            <i className="material-symbols-rounded" aria-hidden="true" >event_available</i> Direct Booking
          </span>
          <h3 id="bm-modal-title" className="bm-header-title">Reserve Your Stay</h3>
          <p className="bm-header-subtitle">Reserve this room now with a simple monthly rental</p>
        </div>

        <div className="bm-body">
          {/* Room Summary Preview */}
          <div className="bm-room-preview">
            {roomData.mainImage && (
              <img 
                src={roomData.resolvedImage || roomData.mainImage} 
                alt={roomData.title} 
                className="bm-room-img" 
                width="120" 
                height="90"
                loading="lazy"
              />
            )}
            <div className="bm-room-info">
              <h4 className="bm-room-name">{roomData.title}</h4>
              {/^\$/.test(String(roomData.price)) ? (
                <span className="bm-room-price">{roomData.price} / month</span>
              ) : (
                <span className="bm-room-price">{roomData.price}</span>
              )}
            </div>
          </div>

          {hasActiveBooking ? (
            <div className="bm-success-box">
              <div className="bm-success-icon">
                <i className="material-symbols-rounded" aria-hidden="true" >info</i>
              </div>
              <h3 className="bm-success-title">You already have a booking for this room.</h3>
              <p className="bm-success-desc">
                Manage or cancel your existing booking from My Bookings before requesting a new one.
              </p>
              <div className="bm-success-actions">
                <button className="bm-secondary-btn" onClick={onClose}>
                  Close
                </button>
                <button className="bm-submit-btn bm-submit-btn--compact" onClick={handleGoToBookings}>
                  <i className="material-symbols-rounded" aria-hidden="true" >checklist</i> View My Bookings
                </button>
              </div>
            </div>
          ) : bookingCheckLoading ? (
            <div className="bm-check-status">
              <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Checking your existing bookings...
            </div>
          ) : isSuccess ? (
            <div className="bm-success-box">
              <div className="bm-success-icon">
                <i className="material-symbols-rounded" aria-hidden="true" >check</i>
              </div>
              <h3 className="bm-success-title">Booking Submitted!</h3>
              <p className="bm-success-desc">
                Your reservation request for <strong>{roomData.title}</strong> has been received with status <strong>Pending Review</strong>.
              </p>
              <div className="bm-success-actions">
                <button className="bm-secondary-btn" onClick={onClose}>
                  Close
                </button>
                <button className="bm-submit-btn bm-submit-btn--compact" onClick={handleGoToBookings}>
                  <i className="material-symbols-rounded" aria-hidden="true" >checklist</i> View My Bookings
                </button>
              </div>
            </div>
          ) : (
            <form className="bm-form" onSubmit={handleSubmit}>
              {error && (
                <div className="bm-error">
                  <i className="material-symbols-rounded" aria-hidden="true" >error</i>
                  <span>{error}</span>
                </div>
              )}

              <div className="bm-field-group">
                <label className="bm-label">
                  <i className="material-symbols-rounded" aria-hidden="true" >person</i> Full Name
                </label>
                <div className="bm-input-wrapper">
                  <i className="material-symbols-rounded" aria-hidden="true" >edit</i>
                  <input
                    type="text"
                    className="bm-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="bm-field-group">
                <label className="bm-label">
                  <i className="material-symbols-rounded" aria-hidden="true" >call</i> Phone Number
                </label>
                <div className="bm-input-wrapper">
                  <i className="material-symbols-rounded" aria-hidden="true" >smartphone</i>
                  <input
                    type="tel"
                    className="bm-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 012 345 678"
                    required
                  />
                </div>
              </div>

              <div className="bm-row">
                <div className="bm-field-group">
                  <label className="bm-label">
                    <i className="material-symbols-rounded" aria-hidden="true" >group</i> Occupants
                  </label>
                  <div className="bm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true" >group</i>
                    <select
                      className="bm-select"
                      value={occupants}
                      onChange={(e) => setOccupants(parseInt(e.target.value, 10))}
                    >
                      <option value="1">1 Person</option>
                      <option value="2">2 Persons</option>
                      <option value="3">3 Persons</option>
                      <option value="4">4 Persons</option>
                    </select>
                  </div>
                </div>

                <div className="bm-field-group">
                  <label className="bm-label">
                    <i className="material-symbols-rounded" aria-hidden="true" >calendar_month</i> Move-in Date
                  </label>
                  <div className="bm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true" >calendar_month</i>
                    <input
                      type="date"
                      className="bm-input"
                      value={moveIn}
                      min={minDate}
                      onChange={(e) => setMoveIn(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="bm-submit-btn" disabled={loading}>
                {loading ? (
                  <><i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Submitting...</>
                ) : (
                  <><i className="material-symbols-rounded" aria-hidden="true" >send</i> Confirm Booking</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
