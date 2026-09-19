import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import PageLoader from './components/PageLoader.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Lazy-loaded page components — each creates its own chunk so only the code
// for the current route is downloaded on first visit.
const Home = lazy(() => import('./pages/Home.jsx'));
const Rent = lazy(() => import('./pages/Rent.jsx'));
const RoomDetail = lazy(() => import('./pages/RoomDetail.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Signin = lazy(() => import('./pages/Signin.jsx'));
const News = lazy(() => import('./pages/News.jsx'));
const NewsDetail = lazy(() => import('./pages/NewsDetail.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const MyBookings = lazy(() => import('./pages/MyBookings.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminRoute = lazy(() => import('./components/AdminRoute.jsx'));
const LandlordDashboard = lazy(() => import('./pages/LandlordDashboard.jsx'));
const LandlordRoute = lazy(() => import('./components/LandlordRoute.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Admin/super_admin are management-only. Public pages (Home, Profile, ...)
// are not part of their flow — send them straight to the admin panel.
function StaffPublicGuard({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loader" role="status">
        <span className="material-symbols-rounded spinning route-spinner" aria-hidden="true">progress_activity</span>
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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </>
  );
}
