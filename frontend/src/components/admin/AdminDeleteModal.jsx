import { useState, useRef } from 'react';
import useDialog from '../../hooks/useDialog';
import { resolveImage } from '../../lib/images';

function formatPrice(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return null;
  return `$${num.toFixed(2)}/month`;
}

export default function AdminDeleteModal({ room, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await onConfirm(room);
    } catch (err) {
      setError(err.message || 'Failed to delete room');
      setDeleting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}>
      <div ref={modalRef} className="admin-modal admin-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-room-title">
        <div className="admin-delete-body">
          <div className="admin-delete-icon">
            <span className="material-symbols-rounded">warning</span>
          </div>

          <h2 id="delete-room-title">Delete Room?</h2>

          <div className="admin-delete-room-info">
            {room.image_url && (
              <img src={resolveImage(room.image_url)} alt={room.title} className="admin-delete-room-image" />
            )}
            <div className="admin-delete-room-details">
              <strong>{room.title}</strong>
              {room.address && <span>{room.address}</span>}
              {formatPrice(room.price) && <span className="admin-delete-room-price">{formatPrice(room.price)}</span>}
            </div>
          </div>

          <p className="admin-delete-warning">
            This will permanently delete the room and its associated bookings. This action cannot be undone.
          </p>

          {room.status === 'occupied' && (
            <p className="admin-delete-warning admin-delete-warning-strong">
              This room still has a student assigned. Remove the student first — deleting a room that holds a
              student is blocked until then.
            </p>
          )}

          <p className="admin-delete-warning admin-delete-warning-hint">
            Reminder: deleting a floor also deletes every room on it.
          </p>

          {error && <div className="admin-error">{error}</div>}
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <span className="admin-btn-loading">
                <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                <span>Deleting...</span>
              </span>
            ) : (
              <span>
                <i className="material-symbols-rounded" aria-hidden="true" >delete</i>
                <span>Delete Room</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
