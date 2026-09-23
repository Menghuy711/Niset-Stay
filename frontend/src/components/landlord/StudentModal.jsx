import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { resolveImage } from '../../lib/images';
import useDialog from '../../hooks/useDialog';

function setDateKey(value) {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function StudentModal({ student, rooms = [], onSave, onClose }) {
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const vacantRooms = rooms.filter((r) => r.status !== 'occupied');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    studentType: 'monthly',
    nationality: '',
    visaExpiry: '',
    contractStart: '',
    contractEnd: '',
    notes: '',
    roomId: '',
  });
  const [idDocUrl, setIdDocUrl] = useState('');
  const [previewIdDoc, setPreviewIdDoc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setForm({
        fullName: student.full_name || '',
        phone: student.phone || '',
        email: student.email || '',
        studentType: student.student_type || 'monthly',
        nationality: student.nationality || '',
        visaExpiry: setDateKey(student.visa_expiry_date),
        contractStart: setDateKey(student.contract_start),
        contractEnd: setDateKey(student.contract_end),
        notes: student.notes || '',
        roomId: '',
      });
      setIdDocUrl(student.id_document_url || '');
      setPreviewIdDoc(student.id_document_url ? resolveImage(student.id_document_url) : '');
    }
  }, [student]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Document size must be under 5MB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Please upload PNG, JPG or WEBP images only');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postForm('/api/uploads', formData);
      setIdDocUrl(res.url);
      setPreviewIdDoc(resolveImage(res.url));
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = async () => {
    if (idDocUrl && idDocUrl.startsWith('/uploads/')) {
      const filename = idDocUrl.split('/uploads/')[1];
      if (filename) {
        try {
          await api.del(`/api/uploads/${encodeURIComponent(filename)}`);
        } catch (err) {
          console.error('Failed to remove uploaded document:', err);
        }
      }
    }
    setIdDocUrl('');
    setPreviewIdDoc('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) {
      setError('Student name is required');
      return;
    }
    if (form.contractStart && form.contractEnd && form.contractEnd < form.contractStart) {
      setError('Contract end date must be on or after the contract start date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        student_type: form.studentType,
        nationality: form.nationality.trim() || null,
        id_document_url: idDocUrl || null,
        visa_expiry_date: form.visaExpiry || null,
        contract_start: form.contractStart || null,
        contract_end: form.contractEnd || null,
        notes: form.notes.trim() || null,
      };
      if (student) {
        await api.patch(`/api/landlord/students/${student.id}`, payload);
      } else {
        await api.post('/api/landlord/students', { ...payload, room_id: form.roomId ? Number(form.roomId) : null });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-student-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="premium-student-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ll-student-modal-title"
        aria-describedby="ll-student-modal-desc"
        ref={modalRef}
      >
        <div className="psm-header">
          <div className="psm-header-main">
            <span className="psm-identity" aria-hidden="true">
              <i className="material-symbols-rounded">badge</i>
            </span>
            <div className="psm-header-text">
              <h2 id="ll-student-modal-title">{student ? 'Edit Student' : 'Add Student'}</h2>
              <p id="ll-student-modal-desc" className="psm-header-sub">
                {student
                  ? `Keep ${student.full_name}'s stay details up to date.`
                  : 'Record a new resident — name, lease and ID in one place.'}
              </p>
            </div>
          </div>
          <button type="button" className="psm-close" onClick={onClose} aria-label="Close modal">
            <i className="material-symbols-rounded" aria-hidden="true">close</i>
          </button>
        </div>

        {error && (
          <div className="psm-error" role="alert">
            <i className="material-symbols-rounded" aria-hidden="true">error</i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="psm-form">
          <div className="psm-body">
            {/* Section 1: Personal Details */}
            <section className="psm-section" aria-labelledby="psm-sec-personal">
              <header className="psm-section-title">
                <i className="material-symbols-rounded" aria-hidden="true">person</i>
                <h3 id="psm-sec-personal">Personal Details</h3>
              </header>
              <div className="psm-grid">
                <div className="psm-group">
                  <label htmlFor="ll-student-name">
                    Full name <span className="psm-required">*</span>
                  </label>
                  <div className="psm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true">badge</i>
                    <input
                      id="ll-student-name"
                      type="text"
                      value={form.fullName}
                      onChange={set('fullName')}
                      placeholder="e.g., Chan Dara"
                      required
                      autoFocus
                      className="psm-input"
                    />
                  </div>
                </div>

                <div className="psm-group">
                  <label id="ll-student-type-label">Student type</label>
                  <div className="psm-seg" role="group" aria-labelledby="ll-student-type-label">
                    {[
                      { key: 'monthly', label: 'Monthly' },
                      { key: 'daily', label: 'Daily' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`psm-seg-btn${form.studentType === opt.key ? ' active' : ''}`}
                        aria-pressed={form.studentType === opt.key}
                        onClick={() => setForm((prev) => ({ ...prev, studentType: opt.key }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="psm-group">
                  <label htmlFor="ll-student-phone">Phone</label>
                  <div className="psm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true">call</i>
                    <input
                      id="ll-student-phone"
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="e.g., 012 345 678"
                      className="psm-input"
                    />
                  </div>
                </div>

                <div className="psm-group">
                  <label htmlFor="ll-student-email">Email</label>
                  <div className="psm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true">mail</i>
                    <input
                      id="ll-student-email"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="e.g., dara@example.com"
                      className="psm-input"
                    />
                  </div>
                  <p className="psm-hint">Leave empty to auto-generate.</p>
                </div>

                <div className="psm-group">
                  <label htmlFor="ll-student-nationality">Nationality</label>
                  <div className="psm-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true">public</i>
                    <input
                      id="ll-student-nationality"
                      type="text"
                      value={form.nationality}
                      onChange={set('nationality')}
                      placeholder="e.g., Khmer, Thai…"
                      className="psm-input"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Lease & Stay Information */}
            <section className="psm-section" aria-labelledby="psm-sec-lease">
              <header className="psm-section-title">
                <i className="material-symbols-rounded" aria-hidden="true">description</i>
                <h3 id="psm-sec-lease">Lease & Stay Information</h3>
              </header>
              <div className="psm-grid">
                <div className="psm-group">
                  <label htmlFor="ll-student-visa">Visa expiry date</label>
                  <div className="psm-input-wrapper">
                    <input
                      id="ll-student-visa"
                      type="date"
                      value={form.visaExpiry}
                      onChange={set('visaExpiry')}
                      className="psm-input"
                    />
                  </div>
                  <p className="psm-hint">You'll get a warning when expiring soon.</p>
                </div>

                {!student && (
                  <div className="psm-group">
                    <label htmlFor="ll-student-room">
                      Assign to room <span className="psm-optional">(optional)</span>
                    </label>
                    <select id="ll-student-room" value={form.roomId} onChange={set('roomId')} className="psm-input">
                      <option value="">Assign later</option>
                      {vacantRooms.map((room) => (
                        <option value={room.id} key={room.id}>{room.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="psm-group">
                  <label htmlFor="ll-student-contract-start">Contract start</label>
                  <input
                    id="ll-student-contract-start"
                    type="date"
                    value={form.contractStart}
                    onChange={set('contractStart')}
                    className="psm-input"
                  />
                </div>

                <div className="psm-group">
                  <label htmlFor="ll-student-contract-end">Contract end</label>
                  <input
                    id="ll-student-contract-end"
                    type="date"
                    value={form.contractEnd}
                    onChange={set('contractEnd')}
                    min={form.contractStart}
                    className="psm-input"
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Attachments & Notes */}
            <section className="psm-section" aria-labelledby="psm-sec-attach">
              <header className="psm-section-title">
                <i className="material-symbols-rounded" aria-hidden="true">attachment</i>
                <h3 id="psm-sec-attach">Attachments & Notes</h3>
              </header>
              <div className="psm-grid">
                <div className="psm-group psm-grid-full">
                  <label htmlFor="ll-student-doc">
                    ID / Passport <span className="psm-optional">(optional, under 5MB)</span>
                  </label>
                  {previewIdDoc ? (
                    <div className="ll-doc-row">
                      <img src={previewIdDoc} alt="Uploaded ID document" className="ll-doc-preview" />
                      <div className="ll-doc-actions">
                        <span className="ll-doc-ok">
                          <i className="material-symbols-rounded" aria-hidden="true">check_circle</i> Document attached
                        </span>
                        <button type="button" className="psm-btn-remove" onClick={handleRemoveDoc}>
                          <i className="material-symbols-rounded" aria-hidden="true">delete</i> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="ll-student-doc-file" className={`psm-dropzone${uploading ? ' psm-dropzone-busy' : ''}`}>
                      <span className="psm-dropzone-ic" aria-hidden="true">
                        <i className={`material-symbols-rounded${uploading ? ' spinning' : ''}`}>
                          {uploading ? 'progress_activity' : 'cloud_upload'}
                        </i>
                      </span>
                      <span className="psm-dropzone-title">
                        {uploading ? 'Uploading…' : 'Click to upload ID / Passport'}
                      </span>
                      {!uploading && <span className="psm-hint">PNG, JPG or WEBP · max 5MB</span>}
                    </label>
                  )}
                  <input
                    id="ll-student-doc-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleDocUpload}
                    disabled={uploading}
                    hidden
                  />
                </div>

                <div className="psm-group psm-grid-full">
                  <label htmlFor="ll-student-notes">Notes</label>
                  <textarea
                    id="ll-student-notes"
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Anything handy — lease length, deposit, preferences…"
                    rows={3}
                    className="psm-input"
                  />
                </div>
              </div>
            </section>
          </div>

          <footer className="psm-footer">
            <span className="psm-footer-hint">Fields marked * are required.</span>
            <div className="psm-footer-actions">
              <button type="button" className="psm-btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="psm-btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <i className="material-symbols-rounded spinning" aria-hidden="true">progress_activity</i>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="material-symbols-rounded" aria-hidden="true">check</i>
                    <span>{student ? 'Update Student' : 'Add Student'}</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}