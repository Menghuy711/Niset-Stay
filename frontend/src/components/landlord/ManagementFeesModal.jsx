import { useState, useRef, useMemo } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

const CURRENCIES = ['USD', 'KHR', 'EUR', 'GBP', 'THB', 'VND', 'AUD'];

function todayKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${day}`;
}

function emptyLineItem() {
  return { description: '', quantity: '', amount: '' };
}

export default function ManagementFeesModal({ rooms, initialRoomId, onSave, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const initialRoom = rooms.find((r) => r.id === initialRoomId) || null;

  const [selectedRoom, setSelectedRoom] = useState(initialRoom);
  const [roomQuery, setRoomQuery] = useState(initialRoom ? initialRoom.title : '');
  const [roomOpen, setRoomOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + (parseFloat(item.amount) || 0) * Math.max(parseFloat(item.quantity) || 1, 0),
        0
      ),
    [lineItems]
  );

  const roomMatches = useMemo(() => {
    const query = roomQuery.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter((r) => r.title.toLowerCase().includes(query));
  }, [rooms, roomQuery]);

  const pickRoom = (room) => {
    setSelectedRoom(room);
    setRoomQuery(room.title);
    setRoomOpen(false);
  };

  const updateItem = (index, key, value) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedRoom) {
      setError('Pick the room this fee belongs to');
      return;
    }
    if (!periodStart || !periodEnd) {
      setError('The service period needs a start and end date');
      return;
    }
    if (periodEnd < periodStart) {
      setError('The service period end must be on or after its start');
      return;
    }
    if (!dueDate) {
      setError('A due date is required');
      return;
    }
    const validItems = lineItems.every(
      (item) =>
        item.description.trim() &&
        item.amount !== '' &&
        Number.isFinite(parseFloat(item.amount)) &&
        parseFloat(item.amount) >= 0
    );
    if (!validItems) {
      setError('Every line item needs a description and a valid amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/landlord/management-fees', {
        room_id: selectedRoom.id,
        owner_name: ownerName.trim() || null,
        owner_contact: ownerContact.trim() || null,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
        currency,
        line_items: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity === '' ? null : Math.max(parseFloat(item.quantity) || 0, 0),
          amount: parseFloat(item.amount),
        })),
      });
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to create the invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal admin-modal-wide ll-mf-modal" role="dialog" aria-modal="true" aria-labelledby="ll-mf-modal-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <span className="ll-mf-title-ic material-symbols-rounded" aria-hidden="true">request_quote</span>
            <h2 id="ll-mf-modal-title">Create Management Fee</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="material-symbols-rounded" aria-hidden="true" >close</i>
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            <div className="admin-form-group">
              <label htmlFor="ll-mf-room">Room <span className="admin-required">*</span></label>
              <div className="ll-fee-room-picker">
                <div className="ll-fee-room-input">
                  <span className="material-symbols-rounded">search</span>
                  <input
                    id="ll-mf-room"
                    type="search"
                    placeholder="Search rooms by name…"
                    value={roomQuery}
                    onChange={(e) => { setRoomQuery(e.target.value); setSelectedRoom(null); setRoomOpen(true); }}
                    onFocus={() => setRoomOpen(true)}
                    autoFocus
                    required
                    className="admin-input"
                  />
                </div>
                {roomOpen && (
                  <div className="ll-fee-room-list" role="listbox" aria-label="Rooms">
                    {roomMatches.length === 0 ? (
                      <div className="ll-fee-room-empty">No rooms match “{roomQuery}”</div>
                    ) : (
                      roomMatches.map((room) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedRoom?.id === room.id}
                          className={`ll-fee-room-opt${selectedRoom?.id === room.id ? ' active' : ''}`}
                          key={room.id}
                          onClick={() => pickRoom(room)}
                        >
                          <span className="material-symbols-rounded">meeting_room</span>
                          <span>
                            <strong>{room.title}</strong>
                            <small>{room.floor_label || 'No floor'}</small>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedRoom && (
                  <div className="ll-fee-room-selected" role="status">
                    <span className="material-symbols-rounded">check_circle</span>
                    Fee will be attached to <strong>{selectedRoom.title}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-mf-owner-name">Owner name</label>
                <input
                  id="ll-mf-owner-name"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g., Dara Chan"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="ll-mf-owner-contact">Owner contact</label>
                <input
                  id="ll-mf-owner-contact"
                  type="text"
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                  placeholder="e.g., +855 12 345 678"
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-mf-start">Service period start <span className="admin-required">*</span></label>
                <input
                  id="ll-mf-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="ll-mf-end">Service period end <span className="admin-required">*</span></label>
                <input
                  id="ll-mf-end"
                  type="date"
                  value={periodEnd}
                  min={periodStart || undefined}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-mf-due">Due date <span className="admin-required">*</span></label>
                <input
                  id="ll-mf-due"
                  type="date"
                  value={dueDate}
                  min={todayKey()}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="admin-input"
                />
                <p className="admin-hint">When the owner should settle this invoice.</p>
              </div>
              <div className="admin-form-group">
                <label htmlFor="ll-mf-currency">Currency <span className="admin-required">*</span></label>
                <select id="ll-mf-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="admin-input">
                  {CURRENCIES.map((c) => (
                    <option value={c} key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label>Line items</label>
              <div className="ll-fee-items" role="group" aria-label="Invoice line items">
                <div className="ll-fee-item-head" aria-hidden="true">
                  <span>Description</span>
                  <span>Qty (months)</span>
                  <span>Amount</span>
                  <span />
                </div>
                {lineItems.map((item, index) => (
                  <div className="ll-fee-item" key={index}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder={index === 0 ? 'Maintenance fee' : 'Description…'}
                      aria-label={`Line item ${index + 1} description`}
                      className="admin-input"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      placeholder="1"
                      aria-label={`Line item ${index + 1} quantity in months`}
                      className="admin-input"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      aria-label={`Line item ${index + 1} amount`}
                      className="admin-input"
                    />
                    <button
                      type="button"
                      className="ll-fee-item-remove"
                      onClick={() => setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                      disabled={lineItems.length === 1}
                      aria-label={`Remove line item ${index + 1}`}
                    >
                      <span className="material-symbols-rounded">remove_circle</span>
                    </button>
                  </div>
                ))}
                <button type="button" className="ll-fee-item-add" onClick={() => setLineItems((prev) => [...prev, emptyLineItem()])}>
                  <span className="material-symbols-rounded">add_circle</span>
                  Add line item
                </button>
              </div>
            </div>

            <div className="ll-fee-total">
              <span>Total</span>
              <strong id="ll-mf-total">${total.toFixed(2)}</strong>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? (
                <span className="admin-btn-loading">
                  <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                  <span>Saving...</span>
                </span>
              ) : (
                <span>
                  <i className="material-symbols-rounded" aria-hidden="true" >request_quote</i>
                  <span>Create Fee</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}