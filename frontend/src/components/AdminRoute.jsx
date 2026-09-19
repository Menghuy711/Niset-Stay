import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loader" role="status">
        <span className="material-symbols-rounded spinning route-spinner" aria-hidden="true">progress_activity</span>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!user || !['admin', 'super_admin'].includes(role)) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
