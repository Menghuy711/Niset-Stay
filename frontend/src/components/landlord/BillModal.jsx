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

function formatShortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const rentValue = (parseFloat(rentRate) || 0) * Math.max(parseFloat(rentQty) || 1, 0);

  const usageOf = (state) => (parseFloat(state.curr) || 0) - (parseFloat(state.prev) || 0);
  const lineAmountOf = (state) => (usageOf(state) > 0 ? usageOf(state) * (parseFloat(state.rate) || 0) : 0);

  const total = useMemo(() => {
    let sum = 0;
    sum += rentValue;

    if (elec.on) sum += lineAmountOf(elec);
    if (water.on) sum += lineAmountOf(water);

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
  }, [rentValue, elec, water, trashOn, extraOn, oneoffs, cfg]);

  const patchElec = (key, value) => setElec((prev) => ({ ...prev, [key]: value }));
  const patchWater = (key, value) => setWater((prev) => ({ ...prev, [key]: value }));
  const updateOneoff = (index, key, value) => {
    setOneoffs((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const buildItems = () => {
    const items = [];
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
  const trashFee = cfg && parseFloat(cfg.trash_fee) > 0 ? parseFloat(cfg.trash_fee) : 0;

  const periodNote = usageFrom && usageTo
    ? `Period: ${formatShortDate(usageFrom)} – ${formatShortDate(usageTo)}`
    : studentId
      ? 'Add usage dates to total their bill'
      : 'Select a student to build their bill';

  return (
    <div className="admin-modal-overlay ll-bc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="admin-modal admin-room-modal admin-modal-wide ll-bc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ll-bill-modal-title"
        ref={modalRef}
      >
        <header className="ll-bc-hero">
          <div className="ll-bc-hero-inner">
            <div className="ll-bc-hero-ident">
              <span className="ll-bc-hero-icon material-symbols-rounded" aria-hidden="true">request_quote</span>
              <div className="ll-bc-hero-copy">
                <h2 id="ll-bill-modal-title">Issue a Bill</h2>
                <p>
                  Itemize rent, meter readings, and one-off charges into a single bill for one student.
                </p>
              </div>
            </div>
            <button type="button" className="ll-bc-close" onClick={onClose} aria-label="Close modal">
              <span className="material-symbols-rounded" aria-hidden="true">close</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="ll-bc-error" role="alert">
            <span className="material-symbols-rounded" aria-hidden="true">error</span>
            <span>{error}</span>
          </div>
        )}

        {!configured ? (
          <form className="admin-room-form ll-bc-form" onSubmit={(e) => { e.preventDefault(); onOpenConfig?.(); }}>
            <div className="admin-form-content ll-bc-content">
              <div className="ll-config-banner">
                <span className="ll-config-banner-icon material-symbols-rounded" aria-hidden="true">tune</span>
                <div>
                  <strong>Billing is not set up yet</strong>
                  <p>Set your room fee and utility rates in Billing Config before you can itemize bills.</p>
                </div>
              </div>
            </div>
            <footer className="ll-bc-footer">
              <span className="ll-bc-live-note" style={{ maxWidth: 260 }}>Rates unlock itemized billing — configure them first.</span>
              <div className="ll-bc-actions">
                <button type="button" className="ll-bc-btn ll-bc-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="ll-bc-btn ll-bc-btn-primary">
                  <span className="material-symbols-rounded" aria-hidden="true">tune</span>
                  <span>Open Billing Config</span>
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="admin-room-form ll-bc-form" noValidate>
            <div className="admin-form-content ll-bc-content">
              {!hasStudentsWithRooms && (
                <div className="ll-config-banner">
                  <span className="ll-config-banner-icon material-symbols-rounded" aria-hidden="true">groups</span>
                  <div>
                    <strong>No students in rooms yet</strong>
                    <p>Assign students to rooms so their bills can track the right room occupant.</p>
                  </div>
                </div>
              )}

              <section className="ll-bc-section">
                <header className="ll-bc-section-head">
                  <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">edit_note</span>
                  <h3>Bill details</h3>
                </header>

                <div className="ll-bc-grid">
                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-student">
                      Student <span className="admin-required">*</span>
                    </label>
                    <div className="ll-bc-input ll-bc-select">
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
                      <span className="material-symbols-rounded ll-bc-chevron" aria-hidden="true">expand_more</span>
                    </div>
                    {selectedStudent && (
                      <p className="ll-bc-hint">
                        {selectedStudent.room_title ? `Room: ${selectedStudent.room_title}` : 'Not assigned to a room yet'}
                      </p>
                    )}
                  </div>

                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-month">Billing month</label>
                    <div className="ll-bc-input ll-bc-select">
                      <select id="ll-bill-month" value={month} onChange={(e) => applyMonth(e.target.value)} className="admin-input">
                        {months.map((opt) => (
                          <option value={opt.value} key={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-rounded ll-bc-chevron" aria-hidden="true">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="ll-bc-grid ll-bc-grid-3 ll-bi-period">
                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-usage-from">Usage from</label>
                    <div className="ll-bc-input">
                      <input id="ll-bill-usage-from" type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)} className="admin-input" />
                    </div>
                  </div>
                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-usage-to">Usage to</label>
                    <div className="ll-bc-input">
                      <input id="ll-bill-usage-to" type="date" value={usageTo} onChange={(e) => setUsageTo(e.target.value)} className="admin-input" />
                    </div>
                  </div>
                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-due">
                      Due date <span className="admin-required">*</span>
                    </label>
                    <div className="ll-bc-input">
                      <input id="ll-bill-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="admin-input" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="ll-bc-section">
                <header className="ll-bc-section-head">
                  <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">meeting_room</span>
                  <h3>Room &amp; rent</h3>
                </header>

                <div className="ll-bi-table">
                  <div className="ll-bi-row ll-bi-row-rent" data-kind="rent">
                    <span className="ll-bi-main ll-bi-main--static">
                      <span className="ll-bi-led ll-bi-led-on" aria-hidden="true" />
                      <span className="ll-bi-meta">
                        <strong>Room Rent</strong>
                        <span>The monthly rent for the student's room.</span>
                      </span>
                    </span>
                    <div className="ll-bi-controls">
                      <div className="ll-bi-field ll-bc-money">
                        <span className="ll-bc-affix" aria-hidden="true">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rentRate}
                          onChange={(e) => setRentRate(e.target.value)}
                          placeholder="0.00"
                          className="admin-input"
                          aria-label="Rent rate"
                        />
                        <span className="ll-bi-field-label">Rate</span>
                      </div>
                      <div className="ll-bi-field">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={rentQty}
                          onChange={(e) => setRentQty(e.target.value)}
                          className="admin-input"
                          aria-label="Rent months"
                        />
                        <span className="ll-bi-field-label">Months</span>
                      </div>
                    </div>
                    <span className="ll-bi-amount ll-bi-amount-on">${rentValue.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              <section className="ll-bc-section">
                <header className="ll-bc-section-head">
                  <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">bolt</span>
                  <h3>Utilities</h3>
                  <span className="ll-bc-section-tag">metered per reading</span>
                </header>

                <div className="ll-bi-table">
                  {[{ key: 'elec', title: 'Electricity', unit: 'kWh' }, { key: 'water', title: 'Water', unit: 'm³' }].map(({ key, title, unit }) => {
                    const state = key === 'elec' ? elec : water;
                    const setter = key === 'elec' ? patchElec : patchWater;
                    const usage = usageOf(state);
                    const lineAmount = lineAmountOf(state);
                    return (
                      <div className={`ll-bi-row${state.on ? ' ll-bi-row-on' : ''}`} data-kind={key} key={key}>
                        <label className="ll-bi-main">
                          <span className="ll-bc-switch">
                            <input
                              type="checkbox"
                              checked={state.on}
                              onChange={(e) => setter('on', e.target.checked)}
                              aria-label={`Toggle ${title} line`}
                            />
                            <span className="ll-bc-switch-track" aria-hidden="true" />
                          </span>
                          <span className="ll-bi-meta">
                            <strong>{title}</strong>
                            <span>
                              {state.on
                                ? usage > 0
                                  ? `${usage.toFixed(1)} ${unit} × $${(parseFloat(state.rate) || 0).toFixed(2)}`
                                  : `Enter ${state.prev ? 'the current' : 'this month'} reading in ${unit}`
                                : `Off — meter reading in ${unit}`}
                            </span>
                          </span>
                        </label>
                        {state.on && (
                          <div className="ll-bi-controls">
                            <div className="ll-bi-field">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={state.prev}
                                onChange={(e) => setter('prev', e.target.value)}
                                className="admin-input"
                                aria-label={`${title} previous reading`}
                              />
                              <span className="ll-bi-field-label">Prev</span>
                            </div>
                            <div className="ll-bi-field">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={state.curr}
                                onChange={(e) => setter('curr', e.target.value)}
                                className="admin-input"
                                aria-label={`${title} current reading`}
                              />
                              <span className="ll-bi-field-label">Curr</span>
                            </div>
                            <div className="ll-bi-field ll-bc-money">
                              <span className="ll-bc-affix" aria-hidden="true">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={state.rate}
                                onChange={(e) => setter('rate', e.target.value)}
                                className="admin-input"
                                aria-label={`${title} rate`}
                              />
                              <span className="ll-bi-field-label">Rate</span>
                            </div>
                          </div>
                        )}
                        <span className={`ll-bi-amount${state.on ? ' ll-bi-amount-on' : ''}`}>{state.on ? `$${lineAmount.toFixed(2)}` : '$0.00'}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="ll-bc-section">
                <header className="ll-bc-section-head">
                  <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">add_circle</span>
                  <h3>Fees &amp; extras</h3>
                  <span className="ll-bc-section-tag">toggle what applies</span>
                </header>

                <div className="ll-bi-table">
                  {trashFee > 0 && (
                    <div className="ll-bi-row ll-bi-row--fixed" data-kind="trash">
                      <label className="ll-bi-main">
                        <span className="ll-bc-switch">
                          <input
                            type="checkbox"
                            checked={trashOn}
                            onChange={(e) => setTrashOn(e.target.checked)}
                            aria-label="Toggle Trash Fee"
                          />
                          <span className="ll-bc-switch-track" aria-hidden="true" />
                        </span>
                        <span className="ll-bi-meta">
                          <strong>Trash Fee</strong>
                          <span>${trashFee.toFixed(2)} per month</span>
                        </span>
                      </label>
                      <span className={`ll-bi-amount${trashOn ? ' ll-bi-amount-on' : ''}`}>{trashOn ? `$${trashFee.toFixed(2)}` : '$0.00'}</span>
                    </div>
                  )}

                  {extraFees.map((fee) => (
                    <div className="ll-bi-row ll-bi-row--fixed" data-kind="additional" key={fee.name}>
                      <label className="ll-bi-main">
                        <span className="ll-bc-switch">
                          <input
                            type="checkbox"
                            checked={!!extraOn[fee.name]}
                            onChange={(e) => setExtraOn((prev) => ({ ...prev, [fee.name]: e.target.checked }))}
                            aria-label={`Toggle ${fee.name} fee`}
                          />
                          <span className="ll-bc-switch-track" aria-hidden="true" />
                        </span>
                        <span className="ll-bi-meta">
                          <strong>{fee.name}</strong>
                          <span>Additional monthly charge</span>
                        </span>
                      </label>
                      <span className={`ll-bi-amount${extraOn[fee.name] ? ' ll-bi-amount-on' : ''}`}>{extraOn[fee.name] ? `$${parseFloat(fee.amount).toFixed(2)}` : '$0.00'}</span>
                    </div>
                  ))}
                </div>

                <div className="ll-bi-oneoffs">
                  <span className="ll-bi-subhead">One-off items</span>
                  {oneoffs.map((item, index) => (
                    <div className="ll-bi-oneoff-row" key={index}>
                      <div className="ll-bc-input">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateOneoff(index, 'label', e.target.value)}
                          placeholder="Item name (e.g., Late fee)"
                          className="admin-input"
                          aria-label={`One-off item name ${index + 1}`}
                        />
                      </div>
                      <div className="ll-bc-input ll-bc-money">
                        <span className="ll-bc-affix" aria-hidden="true">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateOneoff(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="admin-input"
                          aria-label={`One-off amount ${index + 1}`}
                        />
                      </div>
                      <button
                        type="button"
                        className="ll-bc-fee-remove"
                        disabled={oneoffs.length === 1}
                        onClick={() => setOneoffs((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Remove one-off item ${index + 1}`}
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="ll-bc-fee-add" onClick={() => setOneoffs((prev) => [...prev, emptyOneoff()])}>
                    <span className="material-symbols-rounded" aria-hidden="true">add</span>
                    Add item
                  </button>
                </div>

                <div className="ll-bi-note-wrap">
                  <div className="ll-bc-field">
                    <label htmlFor="ll-bill-note">Note <span className="ll-bc-muted">(shown on the invoice)</span></label>
                    <textarea
                      id="ll-bill-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., Rent for September — pay via ABA (Heng Sok)"
                      rows={2}
                      className="admin-textarea ll-bi-note"
                    />
                  </div>
                </div>
              </section>
            </div>

            <footer className="ll-bc-footer">
<div className="ll-bc-live" aria-live="polite">
                  <span className="ll-bc-live-icon material-symbols-rounded" aria-hidden="true">receipt</span>
                  <div className="ll-bc-live-copy" id="ll-bill-total">
                    <span className="ll-bc-live-label">Bill total</span>
                    <strong className="ll-bc-live-value">${total.toFixed(2)}</strong>
                  </div>
                  <span className="ll-bc-live-note">{periodNote}</span>
                </div>
              <div className="ll-bc-actions">
                <button type="button" className="ll-bc-btn ll-bc-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="ll-bc-btn ll-bc-btn-primary" disabled={loading}>
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
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}