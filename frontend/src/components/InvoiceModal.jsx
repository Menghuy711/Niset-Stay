import React, { useRef } from 'react';
import useDialog from '../hooks/useDialog';

function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'cancelled') return 'Cancelled';
  return 'Pending Review';
}

function parseDepositMonths(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, twelve: 12 };
  for (const [word, months] of Object.entries(wordMap)) {
    if (t.includes(word)) return months;
  }
  const digits = t.match(/\d+/);
  return digits ? parseInt(digits[0], 10) : null;
}

function money(value) {
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
}

export default function InvoiceModal({ booking, onClose }) {
  const modalRef = useRef(null);
  useDialog({ open: !!booking, onClose, dialogRef: modalRef });

  if (!booking) return null;

  // Parse the room's price at booking time; never invent one.
  const priceNum = (() => {
    const n = parseFloat(String(booking.room_price || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  // Deposit only when the room's terms state a number of months.
  const depositMonths = parseDepositMonths(booking.deposit_terms);
  const depositNum =
    priceNum != null && depositMonths > 0 ? +(priceNum * depositMonths).toFixed(2) : null;
  const totalNum = priceNum != null && depositNum != null ? +(priceNum + depositNum).toFixed(2) : null;

  const contractTerms = booking.contract_terms || '—';
  const depositText = booking.deposit_terms || '—';
  const utilitiesText = booking.utilities_terms || '—';
  const utilitiesIncluded = /included|free/i.test(utilitiesText);

  const invoiceNo = `INV-${String(booking.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const issueDate = formatDate(booking.created_at);
  const moveInFormatted = formatDate(booking.move_in);
  const priceText = money(priceNum);
  const depositAmount = money(depositNum);
  const totalText = money(totalNum);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="mb-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="mb-invoice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mb-invoice-title"
      >
        {/* Modal Top Controls (Hidden on Print) */}
        <div className="mb-invoice-topbar">
          <span className="mb-invoice-badge">
            <i className="fa-solid fa-file-invoice" /> Booking Invoice &amp; Receipt
          </span>
          <div className="mb-invoice-top-actions">
            <button type="button" className="mb-print-btn" onClick={handlePrint} title="Print Invoice">
              <i className="fa-solid fa-print" /> Print Invoice
            </button>
            <button type="button" className="mb-close-btn" onClick={onClose} aria-label="Close modal">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Container */}
        <div className="mb-invoice-paper">
          {/* Invoice Header */}
          <div className="mb-inv-header">
            <div className="mb-inv-brand">
              <h2 id="mb-invoice-title" className="mb-inv-logo-text">NISET STAY</h2>
              <p className="mb-inv-sub">Student Housing &amp; Room Rentals</p>
              <p className="mb-inv-addr">Phnom Penh, Cambodia &bull; houseandroom@nisetstay.com</p>
            </div>
            <div className="mb-inv-meta">
              <span className="mb-inv-number">{invoiceNo}</span>
              <span className="mb-inv-date">Issued: {issueDate}</span>
              <div className={`mb-inv-status mb-inv-status-${(booking.status || 'pending').toLowerCase()}`}>
                <i className="fa-solid fa-circle" /> {statusLabel(booking.status)}
              </div>
            </div>
          </div>

          <hr className="mb-inv-divider" />
          <div className="mb-inv-grid-2">
              <h4 className="mb-inv-box-title"><i className="fa-solid fa-user-graduate" /> Student Information</h4>
              <p className="mb-inv-text"><strong>Name:</strong> {booking.full_name}</p>
              <p className="mb-inv-text"><strong>Phone:</strong> {booking.phone}</p>
              <p className="mb-inv-text"><strong>Occupants:</strong> {booking.occupants} Person(s)</p>
            </div>

            <div className="mb-inv-box">
              <h4 className="mb-inv-box-title"><i className="fa-solid fa-house-user" /> Property Details</h4>
              <p className="mb-inv-text"><strong>Room:</strong> {booking.room_title}</p>
              <p className="mb-inv-text"><strong>Move-in Date:</strong> {moveInFormatted}</p>
              <p className="mb-inv-text"><strong>Contract Term:</strong> {contractTerms}</p>
            </div>

          {/* Invoice Line Items Table */}
          <div className="mb-inv-table-wrapper">
            <table className="mb-inv-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Terms</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>First Month Rent ({booking.room_title})</strong>
                    <br />
                    <small style={{ color: '#616366' }}>Standard monthly student rental rate</small>
                  </td>
                  <td>1 Month</td>
                  <td style={{ textAlign: 'right' }}>{priceText}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Security Deposit (Refundable)</strong>
                    <br />
                    <small style={{ color: '#616366' }}>{depositText}</small>
                  </td>
                  <td>{depositMonths ? `${depositMonths} Months` : depositText}</td>
                  <td style={{ textAlign: 'right' }}>{depositAmount}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Utilities</strong>
                    <br />
                    <small style={{ color: '#616366' }}>{utilitiesText}</small>
                  </td>
                  <td>{utilitiesIncluded ? 'Included' : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {utilitiesIncluded ? 'Included' : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Invoice Total Calculation */}
          <div className="mb-inv-total-section">
            <div className="mb-inv-notes">
              <h5><i className="fa-solid fa-circle-info" /> Important Terms:</h5>
              <ul>
                <li>Electricity and utilities follow the room's stated terms; confirm final costs with the property manager.</li>
                <li>Property manager will call <strong>{booking.phone}</strong> to arrange key handoff.</li>
                <li>Deposit is refundable upon completion of the rental contract, subject to the room's terms.</li>
              </ul>
            </div>

            <div className="mb-inv-total-card">
              <div className="mb-inv-total-row">
                <span>First Month Rent:</span>
                <span>{priceText}</span>
              </div>
              <div className="mb-inv-total-row">
                <span>Security Deposit:</span>
                <span>{depositAmount}</span>
              </div>
              {totalNum != null ? (
                <div className="mb-inv-total-row mb-inv-grand-total">
                  <span>Est. Total Due:</span>
                  <span>{totalText}</span>
                </div>
              ) : (
                <div className="mb-inv-total-row mb-inv-grand-total">
                  <span>Est. Total Due:</span>
                  <span>Confirm with property manager</span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Footer */}
          <div className="mb-inv-footer">
            <p>Thank you for choosing Niset Stay! For support, contact <strong>houseandroom@nisetstay.com</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}