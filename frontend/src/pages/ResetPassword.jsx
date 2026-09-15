import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import signinCssUrl from '../assets/css/signin.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import signinBanner from '../assets/images/signin_banner.png';
import { api } from '../lib/api';

export default function ResetPassword() {
  usePageStylesheet(signinCssUrl);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const redirectTimerRef = useRef(null);

  // The reset token arrives as ?token=... (from the link given on Forgot Password).
  const resetToken = searchParams.get('token') || '';

  useEffect(() => {
    if (!resetToken) {
      setError('Missing reset token. Please request a new link from Forgot Password.');
    }
  }, [resetToken]);

  useEffect(() => () => clearTimeout(redirectTimerRef.current), []);

  const passwordsMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmTouched(true);
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token: resetToken, new_password: password });
      setDone(true);
      // Redirect to login after 3 seconds
      redirectTimerRef.current = setTimeout(() => navigate('/signin'), 3000);
    } catch (err) {
      if (err.status === 400) {
        setError('Invalid or expired password reset link. Please request a new link from Forgot Password.');
      } else {
        setError(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header activePage="/signin" />

      <main>
        <section className="ns-login-page">
          <div className="ns-login-container">
            {/* Left panel */}
            <div className="ns-login-left-panel">
              <img src={signinBanner} alt="Student Room" className="ns-banner-image" />
              <div className="ns-overlay" />
              <div className="ns-welcome-content">
                <h1>Set New Password</h1>
                <p>Choose a strong password to secure your Niset Stay account.</p>
              </div>
            </div>

            {/* Right panel */}
            <div className="ns-login-right-panel">
              <div className="auth-card">
                <div className="auth-card__header">
                  <h2 className="auth-card__title">New Password</h2>
                  <p className="auth-card__subtitle">Enter and confirm your new password</p>
                </div>

                {done ? (
                  /* ── Success state ─────────────────────────── */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: '48px', color: 'var(--primary-100)', marginBottom: '16px' }}
                    >
                      lock_reset
                    </span>
                    <p className="auth-card__subtitle" style={{ marginBottom: '24px' }}>
                      Password updated successfully! Redirecting to sign in…
                    </p>
                    <Link to="/signin" className="auth-submit">
                      Go to Sign In
                    </Link>
                  </div>
                ) : (
                  /* ── Form ──────────────────────────────────── */
                  <form
                    className="auth-form is-visible"
                    noValidate
                    onSubmit={handleSubmit}
                  >
                    {error && <p className="auth-error" role="alert">{error}</p>}

                    <div className="auth-field">
                      <label className="auth-label" htmlFor="newPassword">New Password</label>
                      <div className="auth-input-wrap">
                        <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">lock</span>
                        <input
                          type={showPw ? 'text' : 'password'}
                          id="newPassword"
                          name="password"
                          className="auth-input"
                          placeholder="Create a new password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="auth-toggle-pw"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPw((v) => !v)}
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">
                            {showPw ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="auth-label" htmlFor="confirmNewPassword">Confirm New Password</label>
                      <div className="auth-input-wrap">
                        <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">lock</span>
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          id="confirmNewPassword"
                          name="confirm_password"
                          className={`auth-input${passwordsMismatch ? ' is-invalid' : ''}`}
                          placeholder="Repeat your new password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setConfirmTouched(true);
                          }}
                        />
                        <button
                          type="button"
                          className="auth-toggle-pw"
                          aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                          onClick={() => setShowConfirmPw((v) => !v)}
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">
                            {showConfirmPw ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <p className="auth-error" hidden={!passwordsMismatch}>Passwords do not match.</p>
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Updating…' : 'Update Password'}
                    </button>

                    <div className="auth-row" style={{ justifyContent: 'center', marginTop: '8px' }}>
                      <Link to="/signin" className="auth-link">Back to Sign In</Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
