import { useState, useRef } from 'react';
import useDialog from '../../hooks/useDialog';

export default function ConfirmDeleteModal({ title, kind, message, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}>
      <div ref={modalRef} className="admin-modal admin-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="ll-confirm-delete-title">
        <div className="admin-delete-body">
          <div className="admin-delete-icon">
            <span className="material-symbols-rounded">warning</span>
          </div>

          <h2 id="ll-confirm-delete-title">Delete {kind}?</h2>

          <div className="admin-delete-room-info">
            <div className="admin-delete-room-details">
              <strong>{title}</strong>
            </div>
          </div>

          <p className="admin-delete-warning">{message}</p>

          {error && <div className="admin-error">{error}</div>}
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="admin-btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <span className="admin-btn-loading">
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Deleting...</span>
              </span>
            ) : (
              <span>
                <i className="fa-solid fa-trash" />
                <span>Delete {kind}</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}