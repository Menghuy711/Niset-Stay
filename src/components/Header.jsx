import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import { useAuth } from '../context/AuthContext.jsx';
import '../assets/css/header-user.css';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/rent', label: 'Rent' },
  { to: '/news', label: 'News & Events' },
  { to: '/about', label: 'About us' },
];

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

  // Derive a display name: prefer full_name metadata, fall back to email
  const displayName = user?.user_metadata?.full_name || user?.email || '';
  const initials = displayName
    ? displayName.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className={`header${headerActive ? ' active' : ''}`} data-header>
      <div className="container">
        <Link to="/" className="logo">
          <img src={logo} width="260" height="40" alt="Niset Stay" />
        </Link>

        <nav className={`navbar${navbarActive ? ' active' : ''}`} data-navbar>
          <ul className="navbar-list">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`navbar-link label-medium${activePage === link.to ? ' active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {user && role === 'admin' && (
              <li>
                <Link
                  to="/admin"
                  className={`navbar-link label-medium${activePage === '/admin' ? ' active' : ''}`}
                >
                  Admin
                </Link>
              </li>
            )}
            {user && (
              <li>
                <Link
                  to="/my-bookings"
                  className={`navbar-link label-medium${activePage === '/my-bookings' ? ' active' : ''}`}
                >
                  My Bookings
                </Link>
              </li>
            )}
          </ul>

          <div className="navbar-wrapper">
            {user ? (
              /* ── Logged-in user badge ─────────────────────────── */
              <div className="header-user-pill">
                <div className="header-user-avatar" title={displayName}>
                  {initials}
                </div>
                <div className="header-user-info">
                  <span className="header-user-name">{displayName}</span>
                  <span className="header-user-role">{role === 'admin' ? 'Admin' : 'Student'}</span>
                </div>
                <button
                  type="button"
                  className="header-logout-btn"
                  onClick={handleSignOut}
                  title="Logout account"
                >
                  <span>Logout</span>
                  <i className="fa-solid fa-right-from-bracket" />
                </button>
              </div>
            ) : (
              /* ── Logged-out state ────────────────────────────── */
              <Link to="/signin" className="btn-link label-medium">Login&nbsp;&nbsp;|&nbsp;&nbsp;Register</Link>
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
