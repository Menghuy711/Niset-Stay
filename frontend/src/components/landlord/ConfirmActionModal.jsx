import { useState, useRef } from 'react';
import useDialog from '../../hooks/useDialog';

export default function ConfirmActionModal({ title, message, confirmLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'The action failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={modalRef} className="admin-modal admin-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="ll-confirm-action-title">
        <div className="admin-delete-body">
          <div className="admin-delete-icon">
            <span className="material-symbols-rounded">help</span>
          </div>

          <h2 id="ll-confirm-action-title">{title}</h2>

          <p className="admin-delete-warning">{message}</p>

          {error && <div className="admin-error">{error}</div>}
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="admin-btn-danger" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <span className="admin-btn-loading">
                <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                <span>Working...</span>
              </span>
            ) : (
              <span>
                <i className="material-symbols-rounded" aria-hidden="true" >check_circle</i>
                <span>{confirmLabel}</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}