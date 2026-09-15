import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

export default function AddFloorModal({ floor, onSave, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (floor) setLabel(floor.label || '');
  }, [floor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!label.trim()) {
      setError('Floor label is required');
      return;
    }
    setLoading(true);
    try {
      if (floor) {
        await api.patch(`/api/landlord/floors/${floor.id}`, { label: label.trim() });
      } else {
        await api.post('/api/landlord/floors', { label: label.trim() });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save floor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal" role="dialog" aria-modal="true" aria-labelledby="ll-floor-modal-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="ll-floor-modal-title">{floor ? 'Edit Floor' : 'Add Floor'}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            <div className="admin-form-group">
              <label htmlFor="ll-floor-label">
                Floor label <span className="admin-required">*</span>
              </label>
              <input
                id="ll-floor-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Floor 1, Ground Floor, Roof"
                required
                autoFocus
                className="admin-input"
              />
              <p className="admin-hint">A short name for this level of your building, e.g. "Floor 2".</p>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? (
                <span className="admin-btn-loading">
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-floppy-disk" />
                  <span>{floor ? 'Update Floor' : 'Add Floor'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}