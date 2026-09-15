import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

function emptyFee() {
  return { name: '', amount: '' };
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

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal admin-modal-wide" role="dialog" aria-modal="true" aria-labelledby="ll-billing-config-title" ref={modalRef}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="ll-billing-config-title">Billing Config</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            <p className="ll-config-intro">
              These rates power automatic monthly bills: rent comes from the default room fee, and utility usage is
              charged per reading from your electricity and water rates.
            </p>

            <div className="admin-form-group">
              <label htmlFor="ll-bc-home-name">Home name (shown on invoices)</label>
              <input
                id="ll-bc-home-name"
                type="text"
                value={form.homeName}
                onChange={set('homeName')}
                placeholder="e.g., Heng Sok Residence"
                className="admin-input"
              />
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-bc-fee">
                  Default room fee ($) <span className="admin-required">*</span>
                </label>
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

              <div className="admin-form-group">
                <label htmlFor="ll-bc-day">Billing day</label>
                <select id="ll-bc-day" value={form.billingDay} onChange={set('billingDay')} className="admin-input">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option value={day} key={day}>{day}</option>
                  ))}
                </select>
                <p className="admin-hint">When monthly bills are due.</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-bc-elec">Electricity rate ($/kWh)</label>
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

              <div className="admin-form-group">
                <label htmlFor="ll-bc-water">Water rate ($/m³)</label>
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

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ll-bc-trash">Trash fee ($/month)</label>
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

              <div className="admin-form-group">
                <label htmlFor="ll-bc-upfront">Months upfront (first bill)</label>
                <select id="ll-bc-upfront" value={form.upfrontMonths} onChange={set('upfrontMonths')} className="admin-input">
                  {[1, 2, 3, 4, 5, 6].map((months) => (
                    <option value={months} key={months}>{months} month{months === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="ll-config-check">
              <input
                type="checkbox"
                checked={form.excludeUtilities}
                onChange={(e) => setForm((prev) => ({ ...prev, excludeUtilities: e.target.checked }))}
              />
              <span>
                Exclude utilities from the <strong>first</strong> bill
                <small>New students get a rent-only first bill; utilities start from the second billing cycle.</small>
              </span>
            </label>

            <div className="admin-form-group">
              <label>Additional fees <span className="admin-hint">(optional monthly charges)</span></label>
              <div className="ll-extra-fees">
                {additionalFees.map((fee, index) => (
                  <div className="ll-extra-fee-row" key={index}>
                    <input
                      type="text"
                      value={fee.name}
                      onChange={(e) => updateFee(index, 'name', e.target.value)}
                      placeholder="e.g., WiFi, Parking, Cleaning"
                      className="admin-input"
                      aria-label={`Additional fee name ${index + 1}`}
                    />
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
                    <button
                      type="button"
                      className="ll-extra-fee-remove"
                      onClick={() => removeFee(index)}
                      aria-label={`Remove additional fee ${index + 1}`}
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  </div>
                ))}
                <button type="button" className="ll-extra-fee-add" onClick={addFee}>
                  <span className="material-symbols-rounded">add</span>
                  Add Fee
                </button>
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
                  <i className="fa-solid fa-gear" />
                  <span>Save Billing Config</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}