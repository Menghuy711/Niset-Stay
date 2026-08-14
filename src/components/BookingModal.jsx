import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import '../assets/css/booking-modal.css';

export default function BookingModal({ isOpen, onClose, roomData }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupants, setOccupants] = useState(1);
  
  // Default move-in date to today YYYY-MM-DD (using local timezone)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [moveIn, setMoveIn] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.email || '';
      setFullName(name);
    }
  }, [user]);

  if (!isOpen || !roomData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!phone.trim()) {
      setError('Please provide a valid phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newBooking = {
        user_id: user.id,
        room_id: roomData.id, // Use UUID directly from room data
        room_title: roomData.title || 'Student Room',
        room_image: roomData.mainImage || '',
        room_price: roomData.price || '',
        full_name: fullName,
        phone: phone,
        occupants: parseInt(occupants, 10),
        move_in: moveIn,
        status: 'pending',
      };

      const { error: insertError } = await supabase
        .from('bookings')
        .insert([newBooking]);

      if (insertError) {
        // If table doesn't exist yet, fallback graceful message or local simulation
        console.error('Supabase error inserting booking:', insertError);
        if (insertError.code === '42P01') {
          // Table doesn't exist error
          setError('Bookings table is not created yet. Please execute the SQL setup in Supabase SQL Editor.');
        } else {
          setError(insertError.message || 'Failed to submit booking. Please try again.');
        }
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setError('An unexpected error occurred. Please try again.');
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
      <div className="bm-modal">
        <div className="bm-header">
          <button className="bm-close-btn" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
          <span className="bm-title-badge">
            <i className="fa-solid fa-calendar-check" /> Direct Booking
          </span>
          <h3 className="bm-header-title">Reserve Your Stay</h3>
          <p className="bm-header-subtitle">Secure your room with monthly student rental</p>
        </div>

        <div className="bm-body">
          {/* Room Summary Preview */}
          <div className="bm-room-preview">
            {roomData.mainImage && (
              <img 
                src={roomData.resolvedImage || roomData.mainImage} 
                alt={roomData.title} 
                className="bm-room-img" 
              />
            )}
            <div className="bm-room-info">
              <h4 className="bm-room-name">{roomData.title}</h4>
              <span className="bm-room-price">{roomData.price} / month</span>
            </div>
          </div>

          {isSuccess ? (
            <div className="bm-success-box">
              <div className="bm-success-icon">
                <i className="fa-solid fa-check" />
              </div>
              <h3 className="bm-success-title">Booking Submitted!</h3>
              <p className="bm-success-desc">
                Your reservation request for <strong>{roomData.title}</strong> has been received with status <strong>Pending</strong>.
              </p>
              <div className="bm-success-actions">
                <button className="bm-secondary-btn" onClick={onClose}>
                  Close
                </button>
                <button className="bm-submit-btn" style={{ width: 'auto', padding: '0 24px' }} onClick={handleGoToBookings}>
                  <i className="fa-solid fa-list-check" /> View My Bookings
                </button>
              </div>
            </div>
          ) : (
            <form className="bm-form" onSubmit={handleSubmit}>
              {error && (
                <div className="bm-error">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bm-field-group">
                <label className="bm-label">
                  <i className="fa-solid fa-user" /> Full Name
                </label>
                <div className="bm-input-wrapper">
                  <i className="fa-solid fa-user-pen" />
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
                  <i className="fa-solid fa-phone" /> Phone Number
                </label>
                <div className="bm-input-wrapper">
                  <i className="fa-solid fa-mobile-screen" />
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
                    <i className="fa-solid fa-users" /> Occupants
                  </label>
                  <div className="bm-input-wrapper">
                    <i className="fa-solid fa-user-group" />
                    <select
                      className="bm-select"
                      value={occupants}
                      onChange={(e) => setOccupants(e.target.value)}
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
                    <i className="fa-solid fa-calendar-days" /> Move-in Date
                  </label>
                  <div className="bm-input-wrapper">
                    <i className="fa-regular fa-calendar" />
                    <input
                      type="date"
                      className="bm-input"
                      value={moveIn}
                      min={todayStr}
                      onChange={(e) => setMoveIn(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="bm-submit-btn" disabled={loading}>
                {loading ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Submitting...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane" /> Confirm Booking</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
