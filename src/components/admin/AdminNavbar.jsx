import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import logo from '../../assets/images/logo.png';

export default function AdminNavbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-container">
        <div className="admin-navbar-left">
          <Link to="/" className="admin-logo">
            <img src={logo} alt="Niset Stay" width="150" height="40" />
            <span className="admin-badge">Admin Panel</span>
          </Link>
        </div>

        <div className="admin-navbar-center">
          <Link to="/admin" className="admin-nav-link active">
            <span className="material-symbols-rounded">dashboard</span>
            Dashboard
          </Link>
          <Link to="/" className="admin-nav-link">
            <span className="material-symbols-rounded">home</span>
            Back to Site
          </Link>
        </div>

        <div className="admin-navbar-right">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              <span className="material-symbols-rounded">account_circle</span>
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.email?.split('@')[0] || 'Admin'}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleSignOut}>
            <span className="material-symbols-rounded">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
