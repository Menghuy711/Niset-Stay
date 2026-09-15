import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './pages/Home.jsx';
import Rent from './pages/Rent.jsx';
import RoomDetail from './pages/RoomDetail.jsx';
import About from './pages/About.jsx';
import Signin from './pages/Signin.jsx';
import News from './pages/News.jsx';
import NewsDetail from './pages/NewsDetail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import LandlordDashboard from './pages/LandlordDashboard.jsx';
import LandlordRoute from './components/LandlordRoute.jsx';
import NotFound from './pages/NotFound.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Admin/super_admin are management-only. Public pages (Home, Profile, ...)
// are not part of their flow — send them straight to the admin panel.
function StaffPublicGuard({ children }) {
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

  if (user && ['admin', 'super_admin'].includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<StaffPublicGuard><Home /></StaffPublicGuard>} />
        <Route path="/rent" element={<Rent />} />
        <Route path="/room/:id" element={<RoomDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/profile" element={<StaffPublicGuard><Profile /></StaffPublicGuard>} />

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/landlord" element={<LandlordRoute><LandlordDashboard /></LandlordRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
