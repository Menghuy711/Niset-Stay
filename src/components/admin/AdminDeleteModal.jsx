import { useState } from 'react';

const propertyImages = import.meta.glob('../../assets/images/property-*.jpg', {
  eager: true,
  import: 'default',
});

function resolveImage(src) {
  if (!src) return '';
  if (/^(https?:|blob:|data:|file:)/.test(src)) return src;
  const match = Object.entries(propertyImages).find(([path]) => path.endsWith(`/${src}`));
  return match ? match[1] : '';
}

export default function AdminDeleteModal({ room, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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
      <div className="admin-modal admin-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-room-title">
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
              {room.price != null && <span className="admin-delete-room-price">${room.price.toFixed(2)}/month</span>}
            </div>
          </div>

          <p className="admin-delete-warning">
            This will permanently delete the room and its associated bookings. This action cannot be undone.
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
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Deleting...</span>
              </span>
            ) : (
              <span>
                <i className="fa-solid fa-trash" />
                <span>Delete Room</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
