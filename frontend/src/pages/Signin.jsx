import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import signinCssUrl from '../assets/css/signin.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import signinBanner from '../assets/images/signin_banner.png';
import { useAuth } from '../context/AuthContext.jsx';

const AUTH_COPY = {
  login: {
    title: 'Sign In',
    subtitle: 'Welcome back to Niset Stay',
    welcomeTitle: 'Welcome Back!',
    welcomeText: 'Find your perfect student room with Niset Stay. Log in to manage bookings, save favourite rooms, and connect with trusted landlords.',
  },
  register: {
    title: 'Create Account',
    subtitle: 'Join Niset Stay today',
    welcomeTitle: 'Welcome to Niset Stay!',
    welcomeText: 'Join thousands of students searching for safe, comfortable, and affordable accommodation near their campus.',
  },
};

function landingPath(role) {
  if (role === 'admin' || role === 'super_admin') return '/admin';
  return '/';
}

export default function Signin() {
  const cssReady = usePageStylesheet(signinCssUrl);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState('login');

  // ── Login form state ──────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register form state ───────────────────────────────────────
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('student');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPw, setShowRegisterPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const copy = AUTH_COPY[mode];
  const passwordsMismatch = confirmTouched && confirmPassword.length > 0 && confirmPassword !== registerPassword;

  const handleTabSwitch = (newMode) => {
    setMode(newMode);
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
    setConfirmTouched(false);
  };

  // ── Login submit ──────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const email = loginEmail.trim();
    if (!email) {
      setLoginError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);
    try {
      const { error, user } = await signIn(email, loginPassword);
      if (error) {
        if (error.status === 401) {
          setLoginError('Incorrect email or password. Please try again.');
        } else {
          setLoginError(error.message || 'Login failed. Please check your credentials.');
        }
      } else {
        navigate(landingPath(user?.role));
      }
    } catch {
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register submit ───────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');

    // Input validation
    if (!registerName.trim()) {
      setRegisterError('Please enter your full name.');
      return;
    }
    if (!registerEmail.trim()) {
      setRegisterError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      setRegisterError('Please enter a valid email address.');
      return;
    }
    if (!registerPassword) {
      setRegisterError('Please enter a password.');
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters long.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setConfirmTouched(true);
      setRegisterError('Passwords do not match.');
      return;
    }

    setRegisterLoading(true);
    try {
      const { error, data, user } = await signUp(registerName.trim(), registerEmail.trim(), registerPassword, registerRole);

      if (error) {
        if (error.status === 400 && /already/i.test(error.message || '')) {
          setRegisterError('An account with this email already exists. Please sign in instead.');
        } else {
          setRegisterError(error.message || 'Failed to create account. Please try again.');
        }
      } else if (data?.hint) {
        // Account was created but the automatic sign-in hiccuped. Tell the
        // user to sign in rather than implying registration failed.
        setRegisterError('');
        setRegisterSuccess(data.hint);
        setLoginEmail(registerEmail.trim());
        setMode('login');
      } else {
        // Auto sign-in succeeded — user is logged in immediately
        navigate(landingPath(user?.role));
      }
    } catch {
      setRegisterError('An unexpected error occurred. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };
  if (!cssReady) return <PageLoader />;

  return (
    <>
      <Header activePage="/signin" />

      <main>
        <section className="ns-login-page">
          <div className="ns-login-container">
            <div className="ns-login-left-panel">
              <img src={signinBanner} alt="Student Room" className="ns-banner-image" />
              <div className="ns-overlay" />
              <div className="ns-welcome-content">
                <h1>{copy.welcomeTitle}</h1>
                <p>{copy.welcomeText}</p>
              </div>
            </div>

            <div className="ns-login-right-panel">
              <div className="auth-card">
                <div className="auth-card__header">
                  <h2 className="auth-card__title">{copy.title}</h2>
                  <p className="auth-card__subtitle">{copy.subtitle}</p>
                </div>

                <div className="auth-tabs" role="tablist" aria-label="Authentication">
                  <button
                    type="button"
                    className={`auth-tab${mode === 'login' ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={mode === 'login'}
                    aria-controls="loginForm"
                    onClick={() => handleTabSwitch('login')}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`auth-tab${mode === 'register' ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={mode === 'register'}
                    aria-controls="registerForm"
                    onClick={() => handleTabSwitch('register')}
                  >
                    Register
                  </button>
                </div>

                {/* ── Login Form ───────────────────────────────── */}
                <form
                  id="loginForm"
                  className={`auth-form${mode === 'login' ? ' is-visible' : ''}`}
                  hidden={mode !== 'login'}
                  noValidate
                  onSubmit={handleLoginSubmit}
                >
                  {loginError && (
                    <p className="auth-error" role="alert">{loginError}</p>
                  )}

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="loginEmail">Email Address</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">mail</span>
                      <input
                        type="email"
                        id="loginEmail"
                        name="email"
                        className="auth-input"
                        placeholder="you@university.edu"
                        autoComplete="username email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="loginPassword">Password</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">lock</span>
                      <input
                        type={showLoginPw ? 'text' : 'password'}
                        id="loginPassword"
                        name="password"
                        className="auth-input"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-toggle-pw"
                        aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                        onClick={() => setShowLoginPw((v) => !v)}
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">
                          {showLoginPw ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-row">
                    <label className="auth-checkbox">
                      <input type="checkbox" id="rememberMe" name="remember" />
                      <span className="auth-checkbox__box" aria-hidden="true" />
                      <span className="auth-checkbox__text">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                  </div>

                  <button type="submit" className="auth-submit" disabled={loginLoading}>
                    {loginLoading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                {/* ── Register Form ─────────────────────────────── */}
                <form
                  id="registerForm"
                  className={`auth-form${mode === 'register' ? ' is-visible' : ''}`}
                  hidden={mode !== 'register'}
                  noValidate
                  onSubmit={handleRegisterSubmit}
                >
                  {registerError && (
                    <p className="auth-error" role="alert">{registerError}</p>
                  )}
                  {registerSuccess && (
                    <p className="auth-success" role="status">{registerSuccess}</p>
                  )}

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="registerName">Full Name</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">person</span>
                      <input
                        type="text"
                        id="registerName"
                        name="name"
                        className="auth-input"
                        placeholder="Your full name"
                        autoComplete="name"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <span className="auth-label" id="registerRoleLabel">I am a</span>
                    <div className="auth-role-picker" role="radiogroup" aria-labelledby="registerRoleLabel">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={registerRole === 'student'}
                        className={`auth-role-option${registerRole === 'student' ? ' is-active' : ''}`}
                        onClick={() => setRegisterRole('student')}
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">school</span>
                        <span>
                          <strong>Student</strong>
                          <small>Looking for a room to rent</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={registerRole === 'landlord'}
                        className={`auth-role-option${registerRole === 'landlord' ? ' is-active' : ''}`}
                        onClick={() => setRegisterRole('landlord')}
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">storefront</span>
                        <span>
                          <strong>Landlord</strong>
                          <small>Listing rooms to rent out</small>
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="registerEmail">Email Address</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">mail</span>
                      <input
                        type="email"
                        id="registerEmail"
                        name="email"
                        className="auth-input"
                        placeholder="you@university.edu"
                        autoComplete="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="registerPassword">Password</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">lock</span>
                      <input
                        type={showRegisterPw ? 'text' : 'password'}
                        id="registerPassword"
                        name="password"
                        className="auth-input"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-toggle-pw"
                        aria-label={showRegisterPw ? 'Hide password' : 'Show password'}
                        onClick={() => setShowRegisterPw((v) => !v)}
                      >
                        <span className="material-symbols-rounded" aria-hidden="true">
                          {showRegisterPw ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="registerConfirmPassword">Confirm Password</label>
                    <div className="auth-input-wrap">
                      <span className="material-symbols-rounded auth-input-icon" aria-hidden="true">lock</span>
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        id="registerConfirmPassword"
                        name="confirm_password"
                        className={`auth-input${passwordsMismatch ? ' is-invalid' : ''}`}
                        placeholder="Repeat your password"
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

                  <button type="submit" className="auth-submit" disabled={registerLoading}>
                    {registerLoading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
