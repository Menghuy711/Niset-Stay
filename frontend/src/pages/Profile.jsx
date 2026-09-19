import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import profileCssUrl from '../assets/css/profile.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet';
import PageLoader from '../components/PageLoader.jsx';
import useDialog from '../hooks/useDialog';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { resolveImage } from '../lib/images';
import { buildAvatarSet, isGeneratedAvatar, newAvatarSeed, resolveAvatarUrl } from '../lib/avatars';

function getInitials(name = '') {
  return name.trim()
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ROLE_LABEL = {
  student: 'Student',
  landlord: 'Landlord',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function Profile() {
  const cssReady = usePageStylesheet(profileCssUrl);
  if (!cssReady) return <PageLoader />;

  const { user, loading: authLoading, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Generated avatar picker
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(null);
  const [avatarSet, setAvatarSet] = useState([]);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarModalRef = useRef(null);
  useDialog({ open: avatarOpen, onClose: () => setAvatarOpen(false), dialogRef: avatarModalRef });

  // Home information (landlord only)
  const [homeName, setHomeName] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [homeLoading, setHomeLoading] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [homeMsg, setHomeMsg] = useState('');
  const [homeError, setHomeError] = useState('');

  // Feedback
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setName(user.full_name || '');
    setPhone(user.phone || '');
    setProfileMsg('');
    setProfileError('');
  }, [user?.id]);

  // Load the landlord's home info when they open the profile page.
  useEffect(() => {
    if (!user || user.role !== 'landlord') return;
    let mounted = true;
    setHomeLoading(true);
    api
      .get('/api/landlord/home')
      .then((home) => {
        if (!mounted) return;
        setHomeName(home?.home_name || '');
        setHomeAddress(home?.home_address || '');
      })
      .catch(() => {
        if (!mounted) return;
        setHomeError('Unable to load home information.');
      })
      .finally(() => {
        if (mounted) setHomeLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const initials = getInitials(user?.full_name || user?.email);

  const openAvatarPicker = () => {
    const label = user?.full_name || user?.email;
    const seed = newAvatarSeed();
    setAvatarSeed(seed);
    setAvatarSet(buildAvatarSet(seed, label));
    setAvatarError('');
    setAvatarOpen(true);
  };

  const shuffleAvatars = () => {
    if (!avatarSeed) return;
    const label = user?.full_name || user?.email;
    const seed = newAvatarSeed();
    setAvatarSeed(seed);
    setAvatarSet(buildAvatarSet(seed, label));
  };

  const handleChooseAvatar = async (token) => {
    setSavingAvatar(true);
    setAvatarError('');
    try {
      await api.patch('/api/users/me', { image_url: token });
      try {
        await refreshUser();
      } catch {
        /* non-fatal: the PATCH above applied; next page load re-syncs */
      }
      setSavingAvatar(false);
      setAvatarOpen(false);
    } catch (err) {
      setSavingAvatar(false);
      setAvatarError(err.message || 'Failed to save avatar.');
    }
  };

  const handleSaveHome = async (e) => {
    e.preventDefault();
    setHomeMsg('');
    setHomeError('');
    setSavingHome(true);
    try {
      await api.put('/api/landlord/home', {
        home_name: homeName.trim() || null,
        home_address: homeAddress.trim() || null,
      });
      setHomeMsg('Home information updated successfully.');
    } catch (err) {
      setHomeError(err.message || 'Failed to update home information.');
    } finally {
      setSavingHome(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    setFeedbackMsg('');
    setFeedbackError('');
    if (!feedbackText.trim()) {
      setFeedbackError('Please write a short note before sending.');
      return;
    }
    setFeedbackSending(true);
    try {
      await api.post('/api/feedback', { message: feedbackText.trim() });
      setFeedbackMsg('Thank you! Your feedback has been sent to the team.');
      setFeedbackText('');
    } catch (err) {
      setFeedbackError(err.message || 'Failed to send feedback.');
    } finally {
      setFeedbackSending(false);
    }
  };

  // Avatar shown in the sidebar card: generated → SVG data URI, otherwise an
  // uploaded asset or a fallback to the initials circle.
  const avatarSrc = user?.image_url
    ? isGeneratedAvatar(user.image_url)
      ? resolveAvatarUrl(user.image_url, user.full_name || user.email)
      : resolveImage(user.image_url, { fallbackToFirst: false, passthroughUnknown: true })
    : '';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    if (!name.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/api/users/me', { full_name: name.trim(), phone: phone.trim() || null });
      // Refresh the in-memory user snapshot so the header/avatar update right
      // away. If that fails (e.g. session expired mid-save) the profile change
      // itself already succeeded, so it must NOT be surfaced as a save error.
      try {
        await refreshUser();
      } catch {
        /* non-fatal: the PATCH above applied; next page load re-syncs */
      }
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (!currentPw) {
      setPwError('Please enter your current password.');
      return;
    }
    if (!newPw || newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/api/auth/change-password', { current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Header activePage="/profile" />

      <main className="pf-page">
        <div className="pf-container">
          <header className="pf-header">
            <span className="pf-badge">
              <i className="material-symbols-rounded" aria-hidden="true" >badge</i> My Account
            </span>
            <h1 className="pf-title">My Profile</h1>
            <p className="pf-subtitle">View and manage your Niset Stay account</p>
          </header>

          {authLoading ? (
            <div className="pf-loading">
              <i className="material-symbols-rounded spinning ms-2x" aria-hidden="true" >progress_activity</i>
              <p>Loading your profile...</p>
            </div>
          ) : !user ? null : (
            <div className="pf-layout">
              {/* ── Sidebar ─────────────────────────────────── */}
              <aside className="pf-sidebar">
                <div className="pf-profile-card">
                  <div className="pf-avatar">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={user.full_name || 'Profile'} width="120" height="120" loading="lazy" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <h2 className="pf-profile-name">{user.full_name || 'Niset Stay Member'}</h2>
                  <span className="pf-profile-role">
                    {ROLE_LABEL[user.role] || 'Member'}
                  </span>
                  <p className="pf-profile-email">{user.email}</p>
                  <p className="pf-profile-since">
                    <i className="material-symbols-rounded" aria-hidden="true" >event_available</i> Member since {formatDate(user.created_at)}
                  </p>
                  <button type="button" className="pf-choose-avatar" onClick={openAvatarPicker}>
                    <i className="material-symbols-rounded" aria-hidden="true" >shuffle</i> Choose an Avatar
                  </button>
                </div>

                <nav className="pf-nav" aria-label="Account shortcuts">
                  {user.role === 'student' && (
                    <Link to="/my-bookings" className="pf-nav-link">
                      <i className="material-symbols-rounded" aria-hidden="true" >checklist</i>
                      <span>My Bookings</span>
                    </Link>
                  )}
                  {user.role === 'landlord' && (
                    <Link to="/landlord" className="pf-nav-link">
                      <i className="material-symbols-rounded" aria-hidden="true" >key</i>
                      <span>Landlord Portal</span>
                    </Link>
                  )}
                  {['admin', 'super_admin'].includes(user.role) && (
                    <Link to="/admin" className="pf-nav-link">
                      <i className="material-symbols-rounded" aria-hidden="true" >speed</i>
                      <span>{user.role === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</span>
                    </Link>
                  )}
                  {!['landlord', 'admin', 'super_admin'].includes(user.role) && (
                    <Link to="/rent" className="pf-nav-link">
                      <i className="material-symbols-rounded" aria-hidden="true" >search</i>
                      <span>Browse Rooms</span>
                    </Link>
                  )}
                </nav>

                <button type="button" className="pf-signout-btn" onClick={handleSignOut}>
                  <i className="material-symbols-rounded" aria-hidden="true" >logout</i> Sign Out
                </button>
              </aside>

              {/* ── Main column ─────────────────────────────── */}
              <div className="pf-main">
                <section className="pf-card" aria-labelledby="pf-details-title">
                  <div className="pf-card-header">
                    <h2 id="pf-details-title" className="pf-card-title">
                      <i className="material-symbols-rounded" aria-hidden="true" >edit</i> Account Details
                    </h2>
                    <p className="pf-card-subtitle">Update the information shown on your profile</p>
                  </div>

                  {profileMsg && (
                    <p className="pf-success" role="status"><i className="material-symbols-rounded" aria-hidden="true" >check_circle</i> {profileMsg}</p>
                  )}
                  {profileError && (
                    <p className="pf-error" role="alert"><i className="material-symbols-rounded" aria-hidden="true" >warning</i> {profileError}</p>
                  )}

                  <form className="pf-form" onSubmit={handleSaveProfile} noValidate>
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfName">Full Name</label>
                      <input
                        id="pfName"
                        type="text"
                        className="pf-input"
                        placeholder="Your full name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfPhone">Phone Number <span className="pf-optional">(optional)</span></label>
                      <input
                        id="pfPhone"
                        type="tel"
                        className="pf-input"
                        placeholder="+855 12 345 678"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfEmail">Email Address</label>
                      <input
                        id="pfEmail"
                        type="email"
                        className="pf-input pf-input-readonly"
                        value={user?.email || ''}
                        readOnly
                        disabled
                      />
                      <p className="pf-hint">Email is the login identifier and cannot be changed.</p>
                    </div>

                    <div className="pf-form-actions">
                      <button type="submit" className="pf-btn-fill" disabled={savingProfile}>
                        {savingProfile ? (
                          <>
                            <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Saving…
                          </>
                        ) : (
                          <>
                            <i className="material-symbols-rounded" aria-hidden="true" >save</i> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="pf-card" aria-labelledby="pf-security-title">
                  <div className="pf-card-header">
                    <h2 id="pf-security-title" className="pf-card-title">
                      <i className="material-symbols-rounded" aria-hidden="true" >security</i> Security
                    </h2>
                    <p className="pf-card-subtitle">Change your account password</p>
                  </div>

                  {pwMsg && (
                    <p className="pf-success" role="status"><i className="material-symbols-rounded" aria-hidden="true" >check_circle</i> {pwMsg}</p>
                  )}
                  {pwError && (
                    <p className="pf-error" role="alert"><i className="material-symbols-rounded" aria-hidden="true" >warning</i> {pwError}</p>
                  )}

                  <form className="pf-form" onSubmit={handleChangePassword} noValidate>
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfCurrentPw">Current Password</label>
                      <div className="pf-pw-wrap">
                        <input
                          id="pfCurrentPw"
                          type={showCurrent ? 'text' : 'password'}
                          className="pf-input"
                          placeholder="Current password"
                          autoComplete="current-password"
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                        />
                        <button
                          type="button"
                          className="pf-toggle-pw"
                          aria-label={showCurrent ? 'Hide password' : 'Show password'}
                          onClick={() => setShowCurrent((v) => !v)}
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">
                            {showCurrent ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfNewPw">New Password</label>
                      <div className="pf-pw-wrap">
                        <input
                          id="pfNewPw"
                          type={showNew ? 'text' : 'password'}
                          className="pf-input"
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          minLength={8}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                        />
                        <button
                          type="button"
                          className="pf-toggle-pw"
                          aria-label={showNew ? 'Hide password' : 'Show password'}
                          onClick={() => setShowNew((v) => !v)}
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">
                            {showNew ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfConfirmPw">Confirm New Password</label>
                      <div className="pf-pw-wrap">
                        <input
                          id="pfConfirmPw"
                          type={showConfirm ? 'text' : 'password'}
                          className="pf-input"
                          placeholder="Repeat your new password"
                          autoComplete="new-password"
                          minLength={8}
                          value={confirmPw}
                          onChange={(e) => setConfirmPw(e.target.value)}
                        />
                        <button
                          type="button"
                          className="pf-toggle-pw"
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                          onClick={() => setShowConfirm((v) => !v)}
                        >
                          <span className="material-symbols-rounded" aria-hidden="true">
                            {showConfirm ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="pf-form-actions">
                      <button type="submit" className="pf-btn-fill" disabled={savingPw}>
                        {savingPw ? (
                          <>
                            <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Updating…
                          </>
                        ) : (
                          <>
                            <i className="material-symbols-rounded" aria-hidden="true" >key</i> Update Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>

                {user.role === 'landlord' && (
                  <section className="pf-card" aria-labelledby="pf-home-title">
                    <div className="pf-card-header">
                      <h2 id="pf-home-title" className="pf-card-title">
                        <i className="material-symbols-rounded" aria-hidden="true" >home</i> Home Information
                      </h2>
                      <p className="pf-card-subtitle">
                        Change the Home Name and Address. The address is what appears on the invoices you send, so it is worth filling in even though it is optional.
                      </p>
                    </div>

                    {homeMsg && (
                      <p className="pf-success" role="status"><i className="material-symbols-rounded" aria-hidden="true" >check_circle</i> {homeMsg}</p>
                    )}
                    {homeError && (
                      <p className="pf-error" role="alert"><i className="material-symbols-rounded" aria-hidden="true" >warning</i> {homeError}</p>
                    )}

                    {homeLoading ? (
                      <p className="pf-hint pf-hint--flush">Loading home information...</p>
                    ) : (
                      <form className="pf-form" onSubmit={handleSaveHome} noValidate>
                        <div className="pf-field">
                          <label className="pf-label" htmlFor="pfHomeName">Home Name</label>
                          <input
                            id="pfHomeName"
                            type="text"
                            className="pf-input"
                            placeholder="e.g. Niset Student Home"
                            autoComplete="off"
                            value={homeName}
                            onChange={(e) => setHomeName(e.target.value)}
                          />
                        </div>

                        <div className="pf-field">
                          <label className="pf-label" htmlFor="pfHomeAddress">
                            Address <span className="pf-optional">(optional)</span>
                          </label>
                          <input
                            id="pfHomeAddress"
                            type="text"
                            className="pf-input"
                            placeholder="Street, city, country"
                            autoComplete="street-address"
                            value={homeAddress}
                            onChange={(e) => setHomeAddress(e.target.value)}
                          />
                        </div>

                        <div className="pf-form-actions">
                          <button type="submit" className="pf-btn-fill" disabled={savingHome}>
                            {savingHome ? (
                              <>
                                <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Saving…
                              </>
                            ) : (
                              <>
                                <i className="material-symbols-rounded" aria-hidden="true" >save</i> Save Home
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}

                <section className="pf-card" aria-labelledby="pf-feedback-title">
                  <div className="pf-card-header">
                    <h2 id="pf-feedback-title" className="pf-card-title">
                      <i className="material-symbols-rounded" aria-hidden="true" >chat</i> Feedback
                    </h2>
                    <p className="pf-card-subtitle">Send a note straight to the team</p>
                  </div>

                  {feedbackMsg && (
                    <p className="pf-success" role="status"><i className="material-symbols-rounded" aria-hidden="true" >check_circle</i> {feedbackMsg}</p>
                  )}
                  {feedbackError && (
                    <p className="pf-error" role="alert"><i className="material-symbols-rounded" aria-hidden="true" >warning</i> {feedbackError}</p>
                  )}

                  <form className="pf-form" onSubmit={handleSendFeedback} noValidate>
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pfFeedback">Your message</label>
                      <textarea
                        id="pfFeedback"
                        className="pf-input pf-textarea"
                        rows={4}
                        maxLength={5000}
                        placeholder="Tell us what you love, what's missing, or how we can improve Niset Stay..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                      />
                    </div>

                    <div className="pf-form-actions">
                      <button type="submit" className="pf-btn-fill" disabled={feedbackSending}>
                        {feedbackSending ? (
                          <>
                            <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i> Sending…
                          </>
                        ) : (
                          <>
                            <i className="material-symbols-rounded" aria-hidden="true" >send</i> Send Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Generated avatar picker ───────────────────────────── */}
      {avatarOpen && (
        <div className="pf-avatar-overlay" role="dialog" aria-modal="true" aria-label="Choose an avatar" onClick={(e) => { if (e.target === e.currentTarget) setAvatarOpen(false); }}>
          <div className="pf-avatar-modal" ref={avatarModalRef}>
            <button type="button" className="pf-avatar-close" aria-label="Close avatar picker" onClick={() => setAvatarOpen(false)}>
              <i className="material-symbols-rounded" aria-hidden="true" >close</i>
            </button>
            <div className="pf-avatar-modal-title">
              <i className="material-symbols-rounded" aria-hidden="true" >shuffle</i> Choose an Avatar
            </div>
            <p className="pf-avatar-modal-subtitle">
              Pick a generated avatar for your profile.
            </p>

            {avatarError && (
              <p className="pf-error" role="alert"><i className="material-symbols-rounded" aria-hidden="true" >warning</i> {avatarError}</p>
            )}

            <div className="pf-avatar-grid">
              {avatarSet.map((a) => (
                <button
                  key={a.token}
                  type="button"
                  className="pf-avatar-option"
                  onClick={() => handleChooseAvatar(a.token)}
                  disabled={savingAvatar}
                  aria-label="Use this avatar"
                >
                  <img src={a.url} alt="Generated avatar option" width="120" height="120" />
                </button>
              ))}
            </div>

            <div className="pf-avatar-actions">
              <button type="button" className="pf-btn-fill" onClick={shuffleAvatars} disabled={savingAvatar}>
                <i className="material-symbols-rounded" aria-hidden="true" >refresh</i> Shuffle Avatars
              </button>
              <button type="button" className="pf-btn-ghost" onClick={() => setAvatarOpen(false)} disabled={savingAvatar}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}