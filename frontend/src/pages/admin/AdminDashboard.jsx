import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { resolveImage } from '../../lib/images';
import AdminRoomModal from '../../components/admin/AdminRoomModal.jsx';
import AdminDeleteModal from '../../components/admin/AdminDeleteModal.jsx';
import AdminNavbar from '../../components/admin/AdminNavbar.jsx';
import AdminFooter from '../../components/admin/AdminFooter.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../assets/css/admin-dashboard.css';

function formatPrice(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return 'N/A';
  return `$${num.toFixed(2)}`;
}

function formatTotalPrice(value) {
  const p = formatPrice(value);
  return p === 'N/A' ? 'Pending' : p;
}

export default function AdminDashboard() {
  const { role, user } = useAuth();
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0
  });

  useEffect(() => {
    fetchStats();
    if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Only clear the toast timer on unmount; clearing it on every tab change
  // would cancel the auto-hide of a toast shown moments before the switch.
  // showToast already clears any pending timer when scheduling a new one.
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Defense-in-depth on top of <AdminRoute>: this page manages other users'
  // roles and accounts, so a non-staff render must never paint admin UI even
  // briefly. The backend independently enforces every privileged action.
  if (!user || !['admin', 'super_admin'].includes(role)) {
    return <Navigate to="/signin" replace />;
  }

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  };

  const fetchStats = async () => {
    // One call returns all dashboard counters
    try {
      const data = await api.get('/api/admin/stats');
      setStats({
        totalRooms: data.totalRooms || 0,
        totalBookings: data.totalBookings || 0,
        pendingBookings: data.pendingBookings || 0,
        confirmedBookings: data.confirmedBookings || 0
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    setLoadError('');
    try {
      // Admin route returns every column (public /api/rooms is column-restricted).
      const data = await api.get('/api/admin/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setLoadError(err?.message || 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

   const fetchBookings = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await api.get('/api/admin/bookings');
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setLoadError(err?.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.get('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setLoadError(err?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserRoleChange = async (id, newRole) => {
    try {
      await api.patch(`/api/users/${id}`, { role: newRole });
      fetchUsers();
      showToast('User role updated.');
    } catch (err) {
      console.error('Failed to update user role:', err);
      showToast(err?.message || "Couldn't update the user role.");
    }
  };

  const handleUserActiveToggle = async (id, isActive) => {
    try {
      await api.patch(`/api/users/${id}`, { is_active: !isActive });
      fetchUsers();
      showToast(isActive ? 'User deactivated.' : 'User activated.');
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      showToast(err?.message || "Couldn't update the user status.");
    }
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setShowModal(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowModal(true);
  };

  const handleDeleteClick = (room) => {
    setDeletingRoom(room);
  };

  const confirmDelete = async (room) => {
    try {
      await api.del(`/api/rooms/${room.id}`);
      setDeletingRoom(null);
      fetchRooms();
      fetchStats();
      showToast(`Room "${room.title}" was deleted`);
    } catch (err) {
      console.error('Failed to delete room:', err);
      setDeletingRoom(null);
      showToast('Failed to delete room. Please try again.');
    }
  };

  const handleRoomSaved = () => {
    setShowModal(false);
    setEditingRoom(null);
    fetchRooms();
    fetchStats();
  };

  const handleBookingStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.patch(`/api/admin/bookings/${bookingId}`, { status: newStatus });
      fetchBookings();
      fetchStats();
      showToast(`Booking marked as ${formatStatus(newStatus)}.`);
    } catch (err) {
      console.error('Failed to update booking status:', err);
      showToast("Couldn't update the booking status — please try again.");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending Review';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <AdminNavbar />

      <main className="admin-main">
        <div className="admin-dashboard">
          <h1 className="admin-page-title">{role === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
          <h2 className="admin-section-title">Overview</h2>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-total">
              <span className="material-symbols-rounded">meeting_room</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.totalRooms}</h3>
              <p>Total Rooms</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-bookings">
              <span className="material-symbols-rounded">event_available</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.totalBookings}</h3>
              <p>Total Bookings</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-pending">
              <span className="material-symbols-rounded">schedule</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.pendingBookings}</h3>
              <p>Pending Review</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-confirmed">
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.confirmedBookings}</h3>
              <p>Confirmed Bookings</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <h2 className="admin-section-title">Manage {activeTab || 'content'}</h2>
        <div className="admin-content-card">
          {/* Header with Tabs */}
          <div className="admin-card-header">
            <div className="admin-tabs">
              <button 
                className={`admin-tab ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                <span className="material-symbols-rounded">meeting_room</span>
                Manage Rooms
              </button>
              <button 
                className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <span className="material-symbols-rounded">event_available</span>
                Manage Bookings
              </button>
              {(role === 'super_admin' || role === 'admin') && (
                <button 
                  className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <span className="material-symbols-rounded">group</span>
                  Manage Users
                </button>
              )}
            </div>

            {activeTab === 'rooms' && (
              <button className="btn-primary" onClick={handleCreate}>
                <span className="material-symbols-rounded">add</span>
                Add New Room
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="admin-card-body">
            {loading ? (
              <div className="admin-loading">
                <span className="material-symbols-rounded spinning">progress_activity</span>
                <p>Loading {activeTab}...</p>
              </div>
            ) : loadError ? (
              <div className="empty-state">
                <span className="material-symbols-rounded">cloud_off</span>
                <h3>Couldn't load {activeTab}</h3>
                <p>{loadError}</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => (activeTab === 'rooms' ? fetchRooms() : activeTab === 'bookings' ? fetchBookings() : fetchUsers())}
                >
                  <span className="material-symbols-rounded">refresh</span>
                  Try Again
                </button>
              </div>
            ) : activeTab === 'users' ? (
              // USERS TAB
              <>
                <div className="admin-table-wrapper">
                {users.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-symbols-rounded">group_off</span>
                    <h3>No users found</h3>
                    <p>Registered accounts will appear here.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar">
                                <span className="material-symbols-rounded">person</span>
                              </div>
                              <div className="student-info">
                                <strong>{u.full_name || u.email}</strong>
                                <small>
                                  <span className="material-symbols-rounded">mail</span>
                                  {u.email}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select
                              className="admin-role-select"
                              value={u.role}
                              disabled={u.id === user?.id}
                              onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                              title={u.id === user?.id ? 'You cannot change your own role' : 'Change role'}
                            >
                              <option value="student">Student</option>
                              <option value="landlord">Landlord</option>
                              {role === 'super_admin' && (
                                <>
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                </>
                              )}
                            </select>
                          </td>
                          <td>
                            <span className={`status-badge ${u.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                              {u.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="admin-actions">
                            <button
                              className={`btn-action ${u.is_active ? 'btn-reject' : 'btn-approve'}`}
                              onClick={() => handleUserActiveToggle(u.id, u.is_active)}
                              disabled={u.id === user?.id}
                              title={u.id === user?.id ? 'You cannot deactivate your own account' : 'Toggle active status'}
                            >
                              <span className="material-symbols-rounded">
                                {u.is_active ? 'block' : 'check_circle'}
                              </span>
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              </>
            ) : activeTab === 'rooms' ? (
              // ROOMS TAB
              <div className="admin-table-wrapper">
                {rooms.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-symbols-rounded">inventory_2</span>
                    <h3>No rooms found</h3>
                    <p>Click "Add New Room" to create your first room listing</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Title</th>
                        <th>Address</th>
                        <th>Price</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id}>
                          <td data-label="Image">
                            {room.image_url ? (
                              <img src={resolveImage(room.image_url)} alt={room.title} className="admin-table-image" width="80" height="60" loading="lazy" />
                            ) : (
                              <div className="no-image-placeholder">
                                <span className="material-symbols-rounded">image</span>
                              </div>
                            )}
                          </td>
                          <td data-label="Title">
                            <div className="room-title-cell">
                              <strong>{room.title}</strong>
                              {room.badge && <span className="room-badge">{room.badge}</span>}
                            </div>
                          </td>
                          <td data-label="Address">
                            <div className="address-cell">
                              <span className="material-symbols-rounded">location_on</span>
                              {room.address || 'N/A'}
                            </div>
                          </td>
                          <td data-label="Price">
                            <span className="price-cell">{formatPrice(room.price)}</span>
                            <small>/month</small>
                          </td>
                          <td data-label="Details">
                            <div className="room-details-cell">
                              <span><span className="material-symbols-rounded">bed</span> {room.beds || 1}</span>
                              <span><span className="material-symbols-rounded">bathtub</span> {room.baths || 1}</span>
                              <span><span className="material-symbols-rounded">straighten</span> {room.sqft || 0} sqft</span>
                            </div>
                          </td>
                          <td data-label="Actions" className="admin-actions">
                            <button 
                              className="btn-icon btn-edit" 
                              onClick={() => handleEdit(room)}
                              title="Edit"
                            >
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                            <button 
                              className="btn-icon btn-delete" 
                              onClick={() => handleDeleteClick(room)}
                              title="Delete"
                            >
                              <span className="material-symbols-rounded">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              // BOOKINGS TAB
              <div className="admin-table-wrapper">
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <span className="material-symbols-rounded">event_busy</span>
                    <h3>No bookings yet</h3>
                    <p>Bookings will appear here once students start making reservations</p>
                  </div>
                ) : (
                  <table className="admin-table admin-bookings-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Room</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Total Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                       {bookings.map((booking) => (
                         <tr key={booking.id}>
                           <td>
                             <div className="student-cell">
                               <div className="student-avatar">
                                 <span className="material-symbols-rounded">person</span>
                               </div>
                               <div className="student-info">
                                 <strong>{booking.full_name || 'N/A'}</strong>
                                 <small>
                                   <span className="material-symbols-rounded">phone</span>
                                   {booking.phone || 'No phone'}
                                 </small>
                               </div>
                             </div>
                           </td>
                           <td>
                             <div className="room-cell">
                               <strong>{booking.room_title || 'N/A'}</strong>
                               <small>{booking.room_price || '$0'}/month</small>
                             </div>
                           </td>
                           <td>
                             <div className="date-cell">
                               <span className="material-symbols-rounded">login</span>
                               {booking.move_in ? new Date(booking.move_in).toLocaleDateString('en-US', { 
                                 month: 'short', 
                                 day: 'numeric', 
                                 year: 'numeric' 
                               }) : 'N/A'}
                             </div>
                           </td>
                           <td>
                             <div className="date-cell">
                               <span className="material-symbols-rounded">logout</span>
                               {booking.check_out ? new Date(booking.check_out).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                }) : 'N/A'}
                             </div>
                           </td>
<td>
                              <span className="price-cell">{formatTotalPrice(booking.total_price)}</span>
                            </td>
<td>
                              <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                                {formatStatus(booking.status)}
                              </span>
                            </td>
                           <td className="admin-actions">
                             {booking.status === 'pending' && (
                               <>
                                 <button 
                                   className="btn-action btn-approve" 
                                   onClick={() => handleBookingStatusUpdate(booking.id, 'confirmed')}
                                 >
                                   <span className="material-symbols-rounded">check_circle</span>
                                   Approve
                                 </button>
                                 <button 
                                   className="btn-action btn-reject" 
                                   onClick={() => handleBookingStatusUpdate(booking.id, 'cancelled')}
                                 >
                                   <span className="material-symbols-rounded">cancel</span>
                                   Reject
                                 </button>
                               </>
                             )}
                             {booking.status === 'confirmed' && (
                               <button 
                                 className="btn-action btn-cancel" 
                                 onClick={() => handleBookingStatusUpdate(booking.id, 'cancelled')}
                               >
                                 <span className="material-symbols-rounded">block</span>
                                 Cancel
                               </button>
                             )}
                             {booking.status === 'cancelled' && (
                               <span className="no-actions">No actions</span>
                             )}
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </main>

      <AdminFooter />

      {showModal && (
        <AdminRoomModal
          room={editingRoom}
          onSave={handleRoomSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {deletingRoom && (
        <AdminDeleteModal
          room={deletingRoom}
          onConfirm={confirmDelete}
          onClose={() => setDeletingRoom(null)}
        />
      )}

      {toast && (
        <div className="admin-toast" role="status">
          <span className="material-symbols-rounded">check_circle</span>
          {toast}
        </div>
      )}
    </>
  );
}
