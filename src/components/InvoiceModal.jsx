import React from 'react';

export default function InvoiceModal({ booking, onClose }) {
  if (!booking) return null;

  // Calculate clean numeric price & deposit estimations
  const priceNum = parseFloat(booking.room_price?.replace(/[^0-9.]/g, '')) || 115;
  const depositNum = priceNum * 2; // 2 months deposit standard
  const totalNum = priceNum + depositNum; // Move-in total (1st month + deposit)

  const invoiceNo = `INV-${String(booking.id).slice(0, 8).toUpperCase()}`;
  const issueDate = new Date(booking.created_at || Date.now()).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const moveInFormatted = new Date(booking.move_in).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mb-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb-invoice-modal">
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
              <h2 className="mb-inv-logo-text">NISET STAY</h2>
              <p className="mb-inv-sub">Student Housing &amp; Room Rentals</p>
              <p className="mb-inv-addr">Phnom Penh, Cambodia &bull; houseandroom@nisetstay.com</p>
            </div>
            <div className="mb-inv-meta">
              <span className="mb-inv-number">{invoiceNo}</span>
              <span className="mb-inv-date">Issued: {issueDate}</span>
              <div className={`mb-inv-status mb-inv-status-${(booking.status || 'pending').toLowerCase()}`}>
                <i className="fa-solid fa-circle" /> {(booking.status || 'pending').toUpperCase()}
              </div>
            </div>
          </div>

          <hr className="mb-inv-divider" />

          {/* Tenant & Rental Info Grid */}
          <div className="mb-inv-info-grid">
            <div className="mb-inv-box">
              <h4 className="mb-inv-box-title"><i className="fa-solid fa-user-graduate" /> Tenant Information</h4>
              <p className="mb-inv-text"><strong>Name:</strong> {booking.full_name}</p>
              <p className="mb-inv-text"><strong>Phone:</strong> {booking.phone}</p>
              <p className="mb-inv-text"><strong>Occupants:</strong> {booking.occupants} Person(s)</p>
            </div>

            <div className="mb-inv-box">
              <h4 className="mb-inv-box-title"><i className="fa-solid fa-house-user" /> Property Details</h4>
              <p className="mb-inv-text"><strong>Room:</strong> {booking.room_title}</p>
              <p className="mb-inv-text"><strong>Move-in Date:</strong> {moveInFormatted}</p>
              <p className="mb-inv-text"><strong>Contract Term:</strong> 1 Year (Monthly Pay)</p>
            </div>
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
                  <td style={{ textAlign: 'right' }}>${priceNum.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Security Deposit (Refundable)</strong>
                    <br />
                    <small style={{ color: '#616366' }}>2 Months deposit as per property policy</small>
                  </td>
                  <td>2 Months</td>
                  <td style={{ textAlign: 'right' }}>${depositNum.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>WiFi &amp; Water Supply</strong>
                    <br />
                    <small style={{ color: '#616366' }}>Included in student stay package</small>
                  </td>
                  <td>Included</td>
                  <td style={{ textAlign: 'right', color: '#16A34A', fontWeight: 'bold' }}>FREE</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Invoice Total Calculation */}
          <div className="mb-inv-total-section">
            <div className="mb-inv-notes">
              <h5><i className="fa-solid fa-circle-info" /> Important Terms:</h5>
              <ul>
                <li>Electricity is metered and paid separately based on monthly usage.</li>
                <li>Property manager will call <strong>{booking.phone}</strong> to arrange key handoff.</li>
                <li>Deposit is fully refundable upon completion of rental contract.</li>
              </ul>
            </div>

            <div className="mb-inv-total-card">
              <div className="mb-inv-total-row">
                <span>Subtotal:</span>
                <span>${priceNum.toFixed(2)}</span>
              </div>
              <div className="mb-inv-total-row">
                <span>Security Deposit:</span>
                <span>${depositNum.toFixed(2)}</span>
              </div>
              <div className="mb-inv-total-row mb-inv-grand-total">
                <span>Est. Total Due:</span>
                <span>${totalNum.toFixed(2)}</span>
              </div>
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
