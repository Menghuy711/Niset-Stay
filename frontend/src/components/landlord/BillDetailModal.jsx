import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import useDialog from '../../hooks/useDialog';

function fmtMoney(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

function toDateObj(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtLong(value) {
  const d = toDateObj(value);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtMonth(value) {
  const d = toDateObj(value);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function itemDetail(item) {
  if ((item.kind === 'electricity' || item.kind === 'water') && item.prev_reading !== null) {
    const unit = item.kind === 'electricity' ? 'kWh' : 'm³';
    return `${Number(item.prev_reading).toFixed(1)} → ${Number(item.curr_reading).toFixed(1)} ${unit}`;
  }
  if (item.quantity && item.rate !== null) return `× ${Number(item.quantity)} @ ${fmtMoney(item.rate)}`;
  if (item.rate !== null) return `@ ${fmtMoney(item.rate)}`;
  return null;
}

function buildInvoiceText(bill, homeName) {
  const lines = [];
  lines.push(`${homeName || 'Invoice'}`);
  lines.push(`Bill for ${fmtMonth(bill.period)}`);
  lines.push('———————————————');
  lines.push(`Student: ${bill.student_name || '—'}`);
  lines.push(`Room: ${bill.room_title || '—'}`);
  if (bill.usage_from) lines.push(`Period: ${fmtLong(bill.usage_from)} → ${fmtLong(bill.usage_to)}`);
  lines.push('');
  (Array.isArray(bill.items) ? bill.items : []).forEach((item) => {
    let line = `• ${item.label}`;
    const detail = itemDetail(item);
    if (detail) line += ` (${detail})`;
    line += ` = ${fmtMoney(item.amount)}`;
    lines.push(line);
  });
  lines.push('');
  lines.push(`Total: ${fmtMoney(bill.amount)}`);
  lines.push(`Due date: ${fmtLong(bill.due_date)}`);
  lines.push(`Status: ${bill.status === 'paid' ? 'Paid' : 'Pending'}`);
  if (bill.note) lines.push(`Note: ${bill.note}`);
  return lines.join('\n');
}

export default function BillDetailModal({ bill, config, onUpdated, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const homeName = (config && config.configured && config.home_name) || '';
  const items = Array.isArray(bill.items) ? bill.items : [];

  const runAction = async (path, toastLabel) => {
    setWorking(true);
    setError('');
    try {
      await api.patch(path);
      onUpdated?.(toastLabel);
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    const text = buildInvoiceText(bill, homeName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Could not copy the invoice. Please try again.');
    }
  };

  const handleShareTelegram = () => {
    const text = buildInvoiceText(bill, homeName);
    const base = window.location.origin;
    const url = `https://t.me/share/url?url=${encodeURIComponent(base)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    setError('');
    window.print();
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal admin-modal-wide ll-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="ll-bill-view-title" ref={modalRef}>
        <div className="admin-modal-header no-print">
          <div className="admin-modal-header-content">
            <h2 id="ll-bill-view-title">Bill Detail</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && <div className="admin-error no-print">{error}</div>}

        <div className="ll-invoice-doc" aria-label="Invoice">
          <div className="ll-invoice-head">
            <div>
              <strong>{homeName || 'Your Residence'}</strong>
              <span>Invoice · {fmtMonth(bill.period)}</span>
            </div>
            <span className={`ll-status ${bill.status === 'paid' ? 'll-status-confirmed' : 'll-status-pending'}`}>
              {bill.status === 'paid' ? 'Paid' : 'Pending'}
            </span>
          </div>

          <div className="ll-invoice-meta">
            <div><span>Student</span><strong>{bill.student_name || '—'}</strong></div>
            <div><span>Room</span><strong>{bill.room_title || '—'}</strong></div>
            {bill.usage_from && (
              <div><span>Period</span><strong>{fmtLong(bill.usage_from)} → {fmtLong(bill.usage_to)}</strong></div>
            )}
            <div><span>Due date</span><strong>{fmtLong(bill.due_date)}</strong></div>
            {bill.paid_at && <div><span>Paid on</span><strong>{fmtLong(bill.paid_at)}</strong></div>}
          </div>

          <table className="ll-invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Detail</th>
                <th>Qty</th>
                <th>Rate</th>
                <th className="ll-invoice-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="5" className="ll-invoice-empty">No itemized lines — this bill only has a total.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.id}-${item.label}`}>
                    <td><strong>{item.label}</strong></td>
                    <td>{itemDetail(item) || '—'}</td>
                    <td>{item.quantity ?? '—'}</td>
                    <td>{item.rate !== null ? fmtMoney(item.rate) : '—'}</td>
                    <td className="ll-invoice-r">{fmtMoney(item.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4">Total due</td>
                <td className="ll-invoice-r ll-invoice-grand">{fmtMoney(bill.amount)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="ll-invoice-note">
            <strong>Bill</strong>
            <span>{bill.note || `Please settle your ${fmtMonth(bill.period)} bill before the due date.`}</span>
          </div>
        </div>

        <div className="admin-modal-footer no-print">
          <button type="button" className="admin-btn-quiet" onClick={onClose}>Close</button>
          <button type="button" className="admin-btn-quiet" onClick={handleCopy} disabled={working}>
            {copied ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-copy" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button type="button" className="admin-btn-quiet" onClick={handleShareTelegram}>
            <i className="fa-brands fa-telegram" />
            <span>Telegram</span>
          </button>
          <button type="button" className="admin-btn-quiet" onClick={handlePrint}>
            <i className="fa-solid fa-print" />
            <span>Print / PDF</span>
          </button>
          {bill.status === 'issued' && (
            <>
              <button
                type="button"
                className="admin-btn-quiet"
                disabled={working}
                onClick={() => runAction(`/api/landlord/bills/${bill.id}/resend`, 'Bill resent to student.')}
              >
                {working ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                <span>Resend</span>
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                disabled={working}
                onClick={() => runAction(`/api/landlord/bills/${bill.id}/mark-paid`, 'Bill marked as paid.')}
              >
                {working ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check-circle" />}
                <span>Mark as Paid</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}