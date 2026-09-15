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
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal admin-modal-wide" role="dialog" aria-modal="true" aria-labelledby="ll-student-modal-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="ll-student-modal-title">{student ? 'Edit Student' : 'Add Student'}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-student-name">
                  Full name <span className="admin-required">*</span>
                </label>
                <input
                  id="ll-student-name"
                  type="text"
                  value={form.fullName}
                  onChange={set('fullName')}
                  placeholder="e.g., Chan Dara"
                  required
                  autoFocus
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-student-type">Student type</label>
                <div className="ll-student-type-seg" role="group" aria-label="Student type">
                  {[
                    { key: 'monthly', label: 'Monthly' },
                    { key: 'daily', label: 'Daily' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`ll-seg-btn${form.studentType === opt.key ? ' active' : ''}`}
                      aria-pressed={form.studentType === opt.key}
                      onClick={() => setForm((prev) => ({ ...prev, studentType: opt.key }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-student-phone">Phone</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-phone" />
                  <input
                    id="ll-student-phone"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="e.g., 012 345 678"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-student-email">Email</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-envelope" />
                  <input
                    id="ll-student-email"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="e.g., dara@example.com"
                    className="admin-input"
                  />
                  <p className="admin-hint">Leave empty and one is generated for you.</p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-student-nationality">Nationality</label>
                <input
                  id="ll-student-nationality"
                  type="text"
                  value={form.nationality}
                  onChange={set('nationality')}
                  placeholder="e.g., Khmer, Thai, Chinese…"
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-student-visa">Visa expiry date</label>
                <input
                  id="ll-student-visa"
                  type="date"
                  value={form.visaExpiry}
                  onChange={set('visaExpiry')}
                  className="admin-input"
                />
                <p className="admin-hint">You'll get a warning when the visa is expiring soon.</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-student-contract-start">Contract start</label>
                <input
                  id="ll-student-contract-start"
                  type="date"
                  value={form.contractStart}
                  onChange={set('contractStart')}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-student-contract-end">Contract end</label>
                <input
                  id="ll-student-contract-end"
                  type="date"
                  value={form.contractEnd}
                  onChange={set('contractEnd')}
                  min={form.contractStart}
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="ll-student-doc">ID / Passport <span className="admin-hint">(optional, under 5MB)</span></label>
              {previewIdDoc ? (
                <div className="ll-doc-row">
                  <img src={previewIdDoc} alt="Uploaded ID document" className="ll-doc-preview" />
                  <div className="ll-doc-actions">
                    <span className="ll-doc-ok">
                      <i className="fa-solid fa-circle-check" /> Document attached
                    </span>
                    <button type="button" className="admin-btn-secondary" onClick={handleRemoveDoc}>
                      <i className="fa-solid fa-trash-can" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ll-doc-upload">
                  <label htmlFor="ll-student-doc-file" className={`ll-doc-dropzone${uploading ? ' ll-doc-busy' : ''}`}>
                    <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-file-image'}`} />
                    <span>{uploading ? 'Uploading…' : 'Click to upload an ID or passport photo'}</span>
                  </label>
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
              )}
            </div>

            <div className="admin-form-grid">
              {!student && (
                <div className="admin-form-group">
                  <label htmlFor="ll-student-room">Assign to room <span className="admin-hint">(optional)</span></label>
                  <select id="ll-student-room" value={form.roomId} onChange={set('roomId')} className="admin-input">
                    <option value="">Assign later</option>
                    {vacantRooms.map((room) => (
                      <option value={room.id} key={room.id}>{room.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="admin-form-group">
                <label htmlFor="ll-student-notes">Notes</label>
                <textarea
                  id="ll-student-notes"
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Anything handy — lease length, deposit, preferences…"
                  rows={3}
                  className="admin-textarea"
                />
              </div>
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
                  <span>{student ? 'Update Student' : 'Add Student'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}