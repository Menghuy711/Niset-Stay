import { useState } from 'react';
import { Link } from 'react-router-dom';
import signinCssUrl from '../assets/css/signin.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import signinBanner from '../assets/images/signin_banner.png';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPassword() {
  usePageStylesheet(signinCssUrl);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // The reset-password page where Supabase will redirect the user after they
  // click the link in their email. Must be listed in Supabase Dashboard →
  // Authentication → URL Configuration → Redirect URLs.
  const resetRedirectTo = `${window.location.origin}/reset-password`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo,
      });

      if (error) {
        setError(error.message || 'Something went wrong. Please try again.');
      } else {
        setSent(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
            {/* Left panel — reuse the same banner */}
            <div className="ns-login-left-panel">
              <img src={signinBanner} alt="Student Room" className="ns-banner-image" />
              <div className="ns-overlay" />
              <div className="ns-welcome-content">
                <h1>Reset Your Password</h1>
                <p>Enter your email address and we'll send you a secure link to reset your password.</p>
              </div>
            </div>

            {/* Right panel */}
            <div className="ns-login-right-panel">
              <div className="auth-card">
                <div className="auth-card__header">
                  <h2 className="auth-card__title">Forgot Password</h2>
                  <p className="auth-card__subtitle">We'll email you a reset link</p>
                </div>

                {sent ? (
                  /* ── Success state ─────────────────────────── */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
                    <span
                      className="material-symbols-rounded"
                      aria-hidden="true"
                      style={{ fontSize: '48px', color: 'var(--primary-100)', marginBottom: '16px' }}
                    >
                      mark_email_read
                    </span>
                    <p className="auth-card__subtitle" style={{ marginBottom: '24px' }}>
                      Check your inbox! A password reset link has been sent to <strong>{email}</strong>.
                    </p>
                    <Link to="/signin" className="auth-submit">
                      Back to Login
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
                      <label className="auth-label" htmlFor="forgotEmail">Email Address</label>
                      <div className="auth-input-wrap">
                        <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">mail</span>
                        <input
                          type="email"
                          id="forgotEmail"
                          name="email"
                          className="auth-input"
                          placeholder="you@university.edu"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>

                    <div className="auth-row" style={{ justifyContent: 'center', marginTop: '8px' }}>
                      <Link to="/signin" className="auth-link">Back to Login</Link>
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
