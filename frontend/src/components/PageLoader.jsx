/**
 * Full-page loading spinner shown while a page's stylesheet is being fetched.
 * Keeps the user in context instead of flashing raw, unstyled HTML (FOUC).
 *
 * The styles are inlined so they work even before any external CSS loads.
 */
export default function PageLoader() {
  return (
    <div className="page-loader" role="status" style={loaderStyle}>
      <span
        className="material-symbols-rounded spinning"
        aria-hidden="true"
        style={spinnerStyle}
      >
        progress_activity
      </span>
      <p style={textStyle}>Loading…</p>
    </div>
  );
}

/* ── Inline styles (must work without any external stylesheet) ──────────── */

const loaderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100%',
  backgroundColor: '#f8f9fb',
  gap: '12px',
};

const spinnerStyle = {
  fontSize: '40px',
  color: '#0D3166',
  animation: 'spin 1s linear infinite',
};

const textStyle = {
  fontFamily: "'Montserrat', sans-serif",
  fontSize: '14px',
  color: '#666',
  margin: 0,
};
