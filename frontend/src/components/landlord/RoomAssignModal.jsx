import { useState, useRef } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

export default function RoomAssignModal({ room, onSaved, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) {
      setError('Student name is required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/landlord/students', {
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      });
      await api.patch(`/api/landlord/rooms/${room.id}/assign`, { student_id: Number(res.id) });
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to create and assign the student');
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal" role="dialog" aria-modal="true" aria-labelledby="ll-assign-modal-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="ll-assign-modal-title">Create Student &amp; Assign</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="admin-modal-intro">
          Add a new student and place them in <strong>{room.title}</strong> in one step.
        </p>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            <div className="admin-form-group">
              <label htmlFor="ll-assign-name">
                Full name <span className="admin-required">*</span>
              </label>
              <input
                id="ll-assign-name"
                type="text"
                value={form.fullName}
                onChange={set('fullName')}
                placeholder="e.g., Chan Dara"
                required
                autoFocus
                className="admin-input"
              />
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-assign-email">Email</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-envelope" />
                  <input
                    id="ll-assign-email"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="e.g., dara@example.com"
                    className="admin-input"
                  />
                </div>
                <p className="admin-hint">Leave empty and one is generated for you.</p>
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-assign-phone">Phone</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-phone" />
                  <input
                    id="ll-assign-phone"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="e.g., 012 345 678"
                    className="admin-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? (
                <span className="admin-btn-loading">
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Creating &amp; assigning...</span>
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-person-plus" />
                  <span>Create &amp; Assign</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}