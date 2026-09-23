import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

function emptyFee() {
  return { name: '', amount: '' };
}

function toFinite(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export default function BillingConfigModal({ config, onSaved, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });

  const [form, setForm] = useState({
    homeName: '',
    defaultRoomFee: '',
    electricityRate: '',
    waterRate: '',
    trashFee: '',
    billingDay: '1',
    excludeUtilities: true,
    upfrontMonths: '1',
  });
  const [additionalFees, setAdditionalFees] = useState([emptyFee()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config && config.configured) {
      setForm({
        homeName: config.home_name || '',
        defaultRoomFee: String(config.default_room_fee ?? ''),
        electricityRate: String(config.electricity_rate ?? ''),
        waterRate: String(config.water_rate ?? ''),
        trashFee: String(config.trash_fee ?? ''),
        billingDay: String(config.default_billing_day ?? '1'),
        excludeUtilities: config.first_bill_exclude_utilities ? true : false,
        upfrontMonths: String(config.upfront_months ?? '1'),
      });
      const fees = Array.isArray(config.additional_fees) ? config.additional_fees : [];
      setAdditionalFees(fees.length ? fees.map((f) => ({ name: f.name, amount: String(f.amount) })) : [emptyFee()]);
    }
  }, [config]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const updateFee = (index, key, value) => {
    setAdditionalFees((prev) => prev.map((fee, i) => (i === index ? { ...fee, [key]: value } : fee)));
  };

  const addFee = () => setAdditionalFees((prev) => [...prev, emptyFee()]);
  const removeFee = (index) => setAdditionalFees((prev) => (prev.length === 1 ? [emptyFee()] : prev.filter((_, i) => i !== index)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const fee = parseFloat(form.defaultRoomFee);
    if (!Number.isFinite(fee) || fee < 0) {
      setError('A default room fee is required');
      return;
    }
    const day = parseInt(form.billingDay, 10);
    if (!Number.isFinite(day) || day < 1 || day > 28) {
      setError('Billing day must be between 1 and 28');
      return;
    }

    const fees = additionalFees
      .map((f) => ({ name: f.name.trim(), amount: parseFloat(f.amount) }))
      .filter((f) => f.name && Number.isFinite(f.amount) && f.amount > 0);

    setLoading(true);
    try {
      await api.put('/api/landlord/billing-config', {
        home_name: form.homeName.trim() || null,
        default_room_fee: fee,
        electricity_rate: parseFloat(form.electricityRate) || 0,
        water_rate: parseFloat(form.waterRate) || 0,
        trash_fee: parseFloat(form.trashFee) || 0,
        default_billing_day: day,
        first_bill_exclude_utilities: form.excludeUtilities,
        upfront_months: parseInt(form.upfrontMonths, 10) || 1,
        additional_fees: fees,
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save billing config');
    } finally {
      setLoading(false);
    }
  };

  const fixedTotal = toFinite(form.defaultRoomFee) + toFinite(form.trashFee)
    + additionalFees.reduce((sum, f) => sum + toFinite(f.amount), 0);

  return (
    <div className="admin-modal-overlay ll-bc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="admin-modal admin-room-modal admin-modal-wide ll-bc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ll-billing-config-title"
        ref={modalRef}
      >
        <header className="ll-bc-hero">
          <div className="ll-bc-hero-inner">
            <div className="ll-bc-hero-ident">
              <span className="ll-bc-hero-icon material-symbols-rounded" aria-hidden="true">receipt_long</span>
              <div className="ll-bc-hero-copy">
                <h2 id="ll-billing-config-title">Billing Config</h2>
                <p>
                  These rates power automatic monthly bills: rent comes from the default room fee, and utility usage
                  is charged per reading from your electricity and water rates.
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

        <form onSubmit={handleSubmit} className="admin-room-form ll-bc-form" noValidate>
          <div className="admin-form-content ll-bc-content">
            <section className="ll-bc-section">
              <header className="ll-bc-section-head">
                <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">home</span>
                <h3>Room &amp; rent</h3>
              </header>

              <div className="ll-bc-field">
                <label htmlFor="ll-bc-home-name">Home name <span className="ll-bc-muted">(shown on invoices)</span></label>
                <div className="ll-bc-input">
                  <input
                    id="ll-bc-home-name"
                    type="text"
                    value={form.homeName}
                    onChange={set('homeName')}
                    placeholder="e.g., Heng Sok Residence"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="ll-bc-grid">
                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-fee">
                    Default room fee <span className="admin-required">*</span>
                  </label>
                  <div className="ll-bc-input ll-bc-money">
                    <span className="ll-bc-affix" aria-hidden="true">$</span>
                    <input
                      id="ll-bc-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.defaultRoomFee}
                      onChange={set('defaultRoomFee')}
                      placeholder="0.00"
                      required
                      autoFocus
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-day">Billing day</label>
                  <div className="ll-bc-input ll-bc-select">
                    <select id="ll-bc-day" value={form.billingDay} onChange={set('billingDay')} className="admin-input">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <option value={day} key={day}>{day}</option>
                      ))}
                    </select>
                    <span className="material-symbols-rounded ll-bc-chevron" aria-hidden="true">expand_more</span>
                  </div>
                  <p className="ll-bc-hint">When monthly bills are due.</p>
                </div>
              </div>
            </section>

            <section className="ll-bc-section">
              <header className="ll-bc-section-head">
                <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">bolt</span>
                <h3>Utilities</h3>
              </header>

              <div className="ll-bc-grid ll-bc-grid-3">
                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-elec">Electricity rate <span className="ll-bc-muted">($/kWh)</span></label>
                  <div className="ll-bc-input">
                    <input
                      id="ll-bc-elec"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.electricityRate}
                      onChange={set('electricityRate')}
                      placeholder="0.25"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-water">Water rate <span className="ll-bc-muted">($/m&sup3;)</span></label>
                  <div className="ll-bc-input">
                    <input
                      id="ll-bc-water"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.waterRate}
                      onChange={set('waterRate')}
                      placeholder="1.50"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-trash">Trash fee <span className="ll-bc-muted">($/month)</span></label>
                  <div className="ll-bc-input">
                    <input
                      id="ll-bc-trash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.trashFee}
                      onChange={set('trashFee')}
                      placeholder="2.00"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="ll-bc-section">
              <header className="ll-bc-section-head">
                <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">calendar_today</span>
                <h3>First bill</h3>
              </header>

              <div className="ll-bc-grid ll-bc-grid-2">
                <div className="ll-bc-field">
                  <label htmlFor="ll-bc-upfront">Months upfront</label>
                  <div className="ll-bc-input ll-bc-select">
                    <select id="ll-bc-upfront" value={form.upfrontMonths} onChange={set('upfrontMonths')} className="admin-input">
                      {[1, 2, 3, 4, 5, 6].map((months) => (
                        <option value={months} key={months}>{months} month{months === 1 ? '' : 's'}</option>
                      ))}
                    </select>
                    <span className="material-symbols-rounded ll-bc-chevron" aria-hidden="true">expand_more</span>
                  </div>
                  <p className="ll-bc-hint">Rent prepaid on a new student's first bill.</p>
                </div>
              </div>

              <label className="ll-bc-toggle">
                <span className="ll-bc-toggle-copy">
                  <strong>Exclude utilities from the <span className="ll-bc-em">first</span> bill</strong>
                  <small>New students get a rent-only first bill; utilities start from the second billing cycle.</small>
                </span>
                <span className="ll-bc-switch">
                  <input
                    type="checkbox"
                    checked={form.excludeUtilities}
                    onChange={(e) => setForm((prev) => ({ ...prev, excludeUtilities: e.target.checked }))}
                  />
                  <span className="ll-bc-switch-track" aria-hidden="true" />
                </span>
              </label>
            </section>

            <section className="ll-bc-section">
              <header className="ll-bc-section-head">
                <span className="ll-bc-section-icon material-symbols-rounded" aria-hidden="true">post_add</span>
                <h3>Additional fees</h3>
                <span className="ll-bc-section-tag">optional monthly charges</span>
              </header>

              <div className="ll-bc-fees">
                {additionalFees.map((fee, index) => (
                  <div className="ll-bc-fee-row" key={index}>
                    <div className="ll-bc-input">
                      <input
                        type="text"
                        value={fee.name}
                        onChange={(e) => updateFee(index, 'name', e.target.value)}
                        placeholder="e.g., WiFi, Parking, Cleaning"
                        className="admin-input"
                        aria-label={`Additional fee name ${index + 1}`}
                      />
                    </div>
                    <div className="ll-bc-input ll-bc-money">
                      <span className="ll-bc-affix" aria-hidden="true">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fee.amount}
                        onChange={(e) => updateFee(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="admin-input"
                        aria-label={`Additional fee amount ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      className="ll-bc-fee-remove"
                      onClick={() => removeFee(index)}
                      aria-label={`Remove additional fee ${index + 1}`}
                    >
                      <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                  </div>
                ))}
                <button type="button" className="ll-bc-fee-add" onClick={addFee}>
                  <span className="material-symbols-rounded" aria-hidden="true">add</span>
                  Add fee
                </button>
              </div>
            </section>
          </div>

          <footer className="ll-bc-footer">
            <div className="ll-bc-live" aria-live="polite">
              <span className="ll-bc-live-icon material-symbols-rounded" aria-hidden="true">receipt_long</span>
              <div className="ll-bc-live-copy">
                <span className="ll-bc-live-label">Fixed monthly total</span>
                <strong className="ll-bc-live-value">${fixedTotal.toFixed(2)}<span className="ll-bc-live-unit">/ month</span></strong>
              </div>
              <span className="ll-bc-live-note">
                {form.excludeUtilities
                  ? 'First bill for new students — utilities start next cycle'
                  : 'Plus electricity &amp; water billed per meter reading'}
              </span>
            </div>
            <div className="ll-bc-actions">
              <button type="button" className="ll-bc-btn ll-bc-btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ll-bc-btn ll-bc-btn-primary" disabled={loading}>
                {loading ? (
                  <span className="admin-btn-loading">
                    <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>
                    <i className="material-symbols-rounded" aria-hidden="true" >save</i>
                    <span>Save Billing Config</span>
                  </span>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}