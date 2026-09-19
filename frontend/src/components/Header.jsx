import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import { useAuth } from '../context/AuthContext.jsx';
import { isGeneratedAvatar, resolveAvatarUrl } from '../lib/avatars.js';
import '../assets/css/header-user.css';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/rent', label: 'Rent' },
  { to: '/news', label: 'News & Events' },
  { to: '/about', label: 'About us' },
];

const ROLE_LABELS = {
  student: 'Student',
  landlord: 'Landlord',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function Header({ activePage }) {
  const [navbarActive, setNavbarActive] = useState(false);
  const [headerActive, setHeaderActive] = useState(false);
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setHeaderActive(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleNavbar = () => setNavbarActive((prev) => !prev);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  // Derive a display name: prefer full_name, fall back to email
  const displayName = user?.full_name || user?.email || '';
  const initials = displayName
    ? displayName.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // Admin/super_admin are management-only: their "identity" link is the panel.
  const isStaff = ['admin', 'super_admin'].includes(role);
  const userProfilePath = isStaff ? '/admin' : '/profile';

  return (
    <header className={`header${headerActive ? ' active' : ''}`} data-header>
      <div className="container">
        <Link to="/" className="logo">
          <img src={logo} width="260" height="40" alt="Niset Stay" />
        </Link>

        <nav className={`navbar${navbarActive ? ' active' : ''}`} data-navbar>
          <ul className="navbar-list">
            {NAV_LINKS.map((link) => {
              let hidden = false;
              if (role === 'landlord' && (link.to === '/rent' || link.to === '/news')) hidden = true;
              if (isStaff && (link.to === '/' || link.to === '/rent' || link.to === '/news' || link.to === '/about')) hidden = true;
              if (hidden) return null;
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`navbar-link label-medium${activePage === link.to ? ' active' : ''}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {user && role === 'landlord' && (
              <li>
                <Link
                  to="/landlord"
                  className={`navbar-link label-medium${activePage === '/landlord' ? ' active' : ''}`}
                >
                  Landlord Portal
                </Link>
              </li>
            )}
            {user && ['admin', 'super_admin'].includes(role) && (
              <li>
                <Link
                  to="/admin"
                  className={`navbar-link label-medium${activePage === '/admin' ? ' active' : ''}`}
                >
                  {role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Link>
              </li>
            )}
            {user && role === 'student' && (
              <li>
                <Link
                  to="/my-bookings"
                  className={`navbar-link label-medium${activePage === '/my-bookings' ? ' active' : ''}`}
                >
                  My Bookings
                </Link>
              </li>
            )}
            {user && !isStaff && (
              <li>
                <Link
                  to="/profile"
                  className={`navbar-link label-medium${activePage === '/profile' ? ' active' : ''}`}
                >
                  Profile
                </Link>
              </li>
            )}
          </ul>

          <div className="navbar-wrapper">
            {user ? (
              /* ── Logged-in user badge ─────────────────────────── */
              <div className="header-user-pill"> 
                <Link to={userProfilePath} className="header-user-avatar" title={displayName}>
                  {user.image_url && isGeneratedAvatar(user.image_url) ? (
                    <img src={resolveAvatarUrl(user.image_url, displayName)} alt={displayName} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </Link>
                <div className="header-user-info">
                  <Link to={userProfilePath} className="header-user-name">{displayName}</Link>
                  <span className="header-user-role">{ROLE_LABELS[role] || 'Student'}</span>
                </div>
                <button
                  type="button"
                  className="header-logout-btn"
                  onClick={handleSignOut}
                  title="Logout account"
                >
                  <span>Logout</span>
                  <i className="material-symbols-rounded" aria-hidden="true" >logout</i>
                </button>
              </div>
            ) : (
              /* ── Logged-out state ────────────────────────────── */
              <Link to="/signin" className="btn-link label-medium">Sign In&nbsp;&nbsp;|&nbsp;&nbsp;Register</Link>
            )}
          </div>
        </nav>

        <button
          className={`nav-toggle-btn icon-btn${navbarActive ? ' active' : ''}`}
          aria-label="toggle navbar"
          data-nav-toggler
          onClick={toggleNavbar}
        >
          <span className="material-symbols-rounded open" aria-hidden="true">menu</span>
          <span className="material-symbols-rounded close" aria-hidden="true">close</span>
        </button>
      </div>
    </header>
  );
}
