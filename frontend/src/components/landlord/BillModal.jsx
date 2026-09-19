import { useState, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

function monthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 8; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    opts.push({ value: `${d.getFullYear()}-${m}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

function emptyOneoff() {
  return { label: '', quantity: '', rate: '', amount: '' };
}

export default function BillModal({ students, config, onOpenConfig, onSave, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const configured = !!(config && config.configured);
  const cfg = configured ? config : null;
  const hasStudentsWithRooms = students.some((s) => s.room_id);

  const months = useMemo(monthOptions, []);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [usageFrom, setUsageFrom] = useState('');
  const [usageTo, setUsageTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const [rentRate, setRentRate] = useState(cfg ? String(cfg.default_room_fee) : '');
  const [rentQty, setRentQty] = useState('1');
  const [elec, setElec] = useState({ prev: '', curr: '', rate: cfg ? String(cfg.electricity_rate) : '', on: false });
  const [water, setWater] = useState({ prev: '', curr: '', rate: cfg ? String(cfg.water_rate) : '', on: false });
  const [trashOn, setTrashOn] = useState(cfg ? Boolean(cfg.trash_fee) : false);
  const [extraOn, setExtraOn] = useState({});
  const [oneoffs, setOneoffs] = useState([emptyOneoff()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applyMonth = (value) => {
    setMonth(value);
    const [year, mon] = value.split('-');
    const lastDay = new Date(Number(year), Number(mon), 0).getDate();
    setUsageFrom(`${year}-${mon}-01`);
    setUsageTo(`${year}-${mon}-${String(lastDay).padStart(2, '0')}`);
  };

  const selectedStudent = students.find((s) => s.id === Number(studentId));

  const total = useMemo(() => {
    let sum = 0;

    const rentValue = (parseFloat(rentRate) || 0) * Math.max(parseFloat(rentQty) || 1, 0);
    sum += rentValue;

    if (elec.on) sum += (parseFloat(elec.curr) || 0) - (parseFloat(elec.prev) || 0) > 0
      ? ((parseFloat(elec.curr) || 0) - (parseFloat(elec.prev) || 0)) * (parseFloat(elec.rate) || 0)
      : 0;
    if (water.on) sum += (parseFloat(water.curr) || 0) - (parseFloat(water.prev) || 0) > 0
      ? ((parseFloat(water.curr) || 0) - (parseFloat(water.prev) || 0)) * (parseFloat(water.rate) || 0)
      : 0;

    if (trashOn && cfg) sum += parseFloat(cfg.trash_fee) || 0;

    if (cfg) {
      (Array.isArray(cfg.additional_fees) ? cfg.additional_fees : []).forEach((fee) => {
        if (extraOn[fee.name]) sum += parseFloat(fee.amount) || 0;
      });
    }

    oneoffs.forEach((item) => {
      if (!(parseFloat(item.amount) || 0)) {
        sum += (parseFloat(item.rate) || 0) * Math.max(parseFloat(item.quantity) || 1, 0);
      } else {
        sum += parseFloat(item.amount) || 0;
      }
    });

    return Math.round(sum * 100) / 100;
  }, [rentRate, rentQty, elec, water, trashOn, extraOn, oneoffs, cfg]);

  const patchElec = (key, value) => setElec((prev) => ({ ...prev, [key]: value }));
  const patchWater = (key, value) => setWater((prev) => ({ ...prev, [key]: value }));
  const updateOneoff = (index, key, value) => {
    setOneoffs((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const buildItems = () => {
    const items = [];
    const rentValue = (parseFloat(rentRate) || 0) * Math.max(parseFloat(rentQty) || 1, 0);
    if (rentValue > 0) {
      items.push({ kind: 'rent', label: 'Room Rent', quantity: parseFloat(rentQty) || 1, rate: parseFloat(rentRate) || 0, amount: rentValue });
    }

    if (elec.on && parseFloat(elec.curr) !== parseFloat(elec.prev)) {
      const usage = (parseFloat(elec.curr) || 0) - (parseFloat(elec.prev) || 0);
      items.push({
        kind: 'electricity',
        label: 'Electricity',
        prev_reading: parseFloat(elec.prev) || 0,
        curr_reading: parseFloat(elec.curr) || 0,
        rate: parseFloat(elec.rate) || 0,
        amount: usage * (parseFloat(elec.rate) || 0),
      });
    }
    if (water.on && parseFloat(water.curr) !== parseFloat(water.prev)) {
      const usage = (parseFloat(water.curr) || 0) - (parseFloat(water.prev) || 0);
      items.push({
        kind: 'water',
        label: 'Water',
        prev_reading: parseFloat(water.prev) || 0,
        curr_reading: parseFloat(water.curr) || 0,
        rate: parseFloat(water.rate) || 0,
        amount: usage * (parseFloat(water.rate) || 0),
      });
    }

    if (trashOn && cfg && parseFloat(cfg.trash_fee) > 0) {
      items.push({ kind: 'trash', label: 'Trash Fee', amount: parseFloat(cfg.trash_fee) });
    }

    if (cfg) {
      (Array.isArray(cfg.additional_fees) ? cfg.additional_fees : []).forEach((fee) => {
        if (extraOn[fee.name]) items.push({ kind: 'additional', label: fee.name, amount: parseFloat(fee.amount) });
      });
    }

    oneoffs.forEach((item) => {
      const label = item.label.trim();
      if (!label) return;
      const amount = parseFloat(item.amount);
      if (Number.isFinite(amount) && amount > 0) {
        items.push({ kind: 'oneoff', label, amount });
      } else {
        const rate = parseFloat(item.rate);
        const qty = Math.max(parseFloat(item.quantity) || 1, 0);
        if (Number.isFinite(rate) && rate > 0) {
          items.push({ kind: 'oneoff', label, quantity: qty, rate, amount: rate * qty });
        }
      }
    });

    return items;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!studentId) {
      setError('Select a student to bill');
      return;
    }
    if (!dueDate) {
      setError('A due date is required');
      return;
    }
    if (!usageFrom || !usageTo || usageTo < usageFrom) {
      setError('Choose a valid billing period');
      return;
    }
    if (elec.on && parseFloat(elec.curr) < parseFloat(elec.prev)) {
      setError('Electricity: current reading cannot be below the previous reading');
      return;
    }
    if (water.on && parseFloat(water.curr) < parseFloat(water.prev)) {
      setError('Water: current reading cannot be below the previous reading');
      return;
    }

    const items = buildItems();
    const withAmount = items.filter((i) => (parseFloat(i.amount) || 0) > 0);
    if (withAmount.length === 0) {
      setError('A bill needs at least one item with an amount — check the rent line or add an item');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/landlord/bills', {
        student_id: Number(studentId),
        period: month,
        usage_from: usageFrom,
        usage_to: usageTo,
        due_date: dueDate,
        note: note.trim() || null,
        items: withAmount,
      });
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to issue the bill');
    } finally {
      setLoading(false);
    }
  };

  const extraFees = cfg && Array.isArray(cfg.additional_fees) ? cfg.additional_fees : [];

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal admin-modal-wide" role="dialog" aria-modal="true" aria-labelledby="ll-bill-modal-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="ll-bill-modal-title">Issue a Bill</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="material-symbols-rounded" aria-hidden="true" >close</i>
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        {!configured ? (
          <form className="admin-room-form" onSubmit={(e) => { e.preventDefault(); onOpenConfig?.(); }}>
            <div className="admin-form-content">
              <div className="ll-config-banner">
                <span className="ll-config-banner-icon material-symbols-rounded">tune</span>
                <div>
                  <strong>Billing is not set up yet</strong>
                  <p>Set your room fee and utility rates in Billing Config before you can itemize bills.</p>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="admin-btn-primary">
                <i className="material-symbols-rounded" aria-hidden="true" >settings</i>
                <span>Open Billing Config</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="admin-room-form">
            <div className="admin-form-content">
              {!hasStudentsWithRooms && (
                <div className="ll-config-banner">
                  <span className="ll-config-banner-icon material-symbols-rounded">groups</span>
                  <div>
                    <strong>No students in rooms yet</strong>
                    <p>Assign students to rooms so their bills can track the right room occupant.</p>
                  </div>
                </div>
              )}

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="ll-bill-student">
                    Student <span className="admin-required">*</span>
                  </label>
                  <select
                    id="ll-bill-student"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="admin-input"
                  >
                    <option value="">Select a student…</option>
                    {students.map((s) => (
                      <option value={s.id} key={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                  {selectedStudent && (
                    <p className="admin-hint">
                      {selectedStudent.room_title ? `Room: ${selectedStudent.room_title}` : 'Not assigned to a room yet'}
                    </p>
                  )}
                </div>

                <div className="admin-form-group">
                  <label htmlFor="ll-bill-month">Billing month</label>
                  <select id="ll-bill-month" value={month} onChange={(e) => applyMonth(e.target.value)} className="admin-input">
                    {months.map((opt) => (
                      <option value={opt.value} key={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="ll-bill-usage-from">Usage from</label>
                  <input id="ll-bill-usage-from" type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)} className="admin-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="ll-bill-usage-to">Usage to</label>
                  <input id="ll-bill-usage-to" type="date" value={usageTo} onChange={(e) => setUsageTo(e.target.value)} className="admin-input" />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="ll-bill-due">
                    Due date <span className="admin-required">*</span>
                  </label>
                  <input id="ll-bill-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="admin-input" />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Bill items</label>
                <div className="ll-bill-items">
                  <div className="ll-bill-item ll-bill-item-rent" data-kind="rent">
                    <div className="ll-bill-item-meta">
                      <strong>Room Rent</strong>
                      <span>The monthly rent for the student's room.</span>
                    </div>
                    <div className="ll-bill-item-inputs">
                      <label>
                        <span className="ll-inline-label">Rate ($)</span>
                        <input type="number" min="0" step="0.01" value={rentRate} onChange={(e) => setRentRate(e.target.value)} className="admin-input" aria-label="Rent rate" />
                      </label>
                      <label>
                        <span className="ll-inline-label">Months</span>
                        <input type="number" min="1" step="1" value={rentQty} onChange={(e) => setRentQty(e.target.value)} className="admin-input" aria-label="Rent months" />
                      </label>
                    </div>
                  </div>

                  {[{ key: 'elec', title: 'Electricity', unit: 'kWh' }, { key: 'water', title: 'Water', unit: 'm³' }].map(({ key, title, unit }) => {
                    const state = key === 'elec' ? elec : water;
                    const setter = key === 'elec' ? patchElec : patchWater;
                    const usage = ((parseFloat(state.curr) || 0) - (parseFloat(state.prev) || 0));
                    const lineAmount = usage > 0 ? usage * (parseFloat(state.rate) || 0) : 0;
                    return (
                      <div className={`ll-bill-item ll-bill-item-utility${state.on ? ' ll-bill-item-on' : ''}`} data-kind={key} key={key}>
                        <label className="ll-bill-item-check">
                          <input
                            type="checkbox"
                            checked={state.on}
                            onChange={(e) => setter('on', e.target.checked)}
                            aria-label={`Toggle ${title} line`}
                          />
                          <span className="ll-bill-item-meta ll-bill-item-meta--flush">
                            <strong>{title}</strong>
                            <span>{usage > 0 ? `${usage.toFixed(1)} ${unit} × $${(parseFloat(state.rate) || 0).toFixed(2)}` : `Meter reading in ${unit}`}</span>
                          </span>
                        </label>
                        {state.on && (
                          <div className="ll-bill-item-inputs">
                            <label>
                              <span className="ll-inline-label">Prev</span>
                              <input type="number" min="0" step="1" value={state.prev} onChange={(e) => setter('prev', e.target.value)} className="admin-input" aria-label={`${title} previous reading`} />
                            </label>
                            <label>
                              <span className="ll-inline-label">Curr</span>
                              <input type="number" min="0" step="1" value={state.curr} onChange={(e) => setter('curr', e.target.value)} className="admin-input" aria-label={`${title} current reading`} />
                            </label>
                            <label>
                              <span className="ll-inline-label">Rate ($)</span>
                              <input type="number" min="0" step="0.01" value={state.rate} onChange={(e) => setter('rate', e.target.value)} className="admin-input" aria-label={`${title} rate`} />
                            </label>
                            <span className={`ll-bill-item-amount ll-bill-item-amount-${key}`}>{`$${lineAmount.toFixed(2)}`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {cfg && parseFloat(cfg.trash_fee) > 0 && (
                    <div className="ll-bill-item ll-bill-item-fixed" data-kind="trash">
                      <label className="ll-bill-item-check">
                        <input type="checkbox" checked={trashOn} onChange={(e) => setTrashOn(e.target.checked)} aria-label="Toggle trash fee" />
                        <span className="ll-bill-item-meta ll-bill-item-meta--flush">
                          <strong>Trash Fee</strong>
                          <span>${parseFloat(cfg.trash_fee).toFixed(2)} per month</span>
                        </span>
                      </label>
                      <span className="ll-bill-item-amount">{trashOn ? `$${parseFloat(cfg.trash_fee).toFixed(2)}` : '$0.00'}</span>
                    </div>
                  )}

                  {extraFees.map((fee) => (
                    <div className="ll-bill-item ll-bill-item-fixed" data-kind="additional" key={fee.name}>
                      <label className="ll-bill-item-check">
                        <input
                          type="checkbox"
                          checked={!!extraOn[fee.name]}
                          onChange={(e) => setExtraOn((prev) => ({ ...prev, [fee.name]: e.target.checked }))}
                          aria-label={`Toggle ${fee.name} fee`}
                        />
                        <span className="ll-bill-item-meta ll-bill-item-meta--flush">
                          <strong>{fee.name}</strong>
                          <span>Additional monthly charge</span>
                        </span>
                      </label>
                      <span className="ll-bill-item-amount">{extraOn[fee.name] ? `$${parseFloat(fee.amount).toFixed(2)}` : '$0.00'}</span>
                    </div>
                  ))}

                  <div className="ll-bill-items-extra">
                    <span className="ll-bill-items-extra-label">One-off items</span>
                    {oneoffs.map((item, index) => (
                      <div className="ll-bill-item ll-bill-item-oneoff" data-kind="oneoff" key={index}>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateOneoff(index, 'label', e.target.value)}
                          placeholder="Item name (e.g., Late fee)"
                          className="admin-input"
                          aria-label={`One-off item name ${index + 1}`}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateOneoff(index, 'amount', e.target.value)}
                          placeholder="Amount ($)"
                          className="admin-input"
                          aria-label={`One-off amount ${index + 1}`}
                        />
                        <button
                          type="button"
                          className="ll-fee-item-remove"
                          disabled={oneoffs.length === 1}
                          onClick={() => setOneoffs((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Remove one-off item ${index + 1}`}
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    ))}
                    <button type="button" className="ll-fee-item-add" onClick={() => setOneoffs((prev) => [...prev, emptyOneoff()])}>
                      <span className="material-symbols-rounded">add</span>
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="ll-bill-note">Note</label>
                <textarea
                  id="ll-bill-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Rent for September — pay via ABA (Heng Sok)"
                  rows={2}
                  className="admin-textarea"
                />
              </div>

              <div className="ll-bill-total" id="ll-bill-total">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="admin-btn-primary" disabled={loading}>
                {loading ? (
                  <span className="admin-btn-loading">
                    <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                    <span>Issuing...</span>
                  </span>
                ) : (
                  <span>
                    <i className="material-symbols-rounded" aria-hidden="true" >receipt_long</i>
                    <span>Issue Bill</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}