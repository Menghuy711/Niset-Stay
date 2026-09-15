import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#616366',
          fontSize: '1.6rem',
        }}
      >
        <span className="material-symbols-rounded spinning" aria-hidden="true" style={{ fontSize: '4.8rem' }}>
          progress_activity
        </span>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!user || !['admin', 'super_admin'].includes(role)) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
