import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminRoomModal from '../../components/admin/AdminRoomModal.jsx';
import AdminNavbar from '../../components/admin/AdminNavbar.jsx';
import AdminFooter from '../../components/admin/AdminFooter.jsx';
import '../../assets/css/admin-dashboard.css';

const propertyImages = import.meta.glob('../../assets/images/property-*.jpg', {
  eager: true,
  import: 'default',
});

function resolveImage(src) {
  if (!src) return '';
  if (/^(https?:|blob:|data:|file:)/.test(src)) return src;
  const match = Object.entries(propertyImages).find(([path]) => path.endsWith(`/${src}`));
  return match ? match[1] : '';
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
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
    } else {
      fetchBookings();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    // Fetch total rooms
    const { count: roomCount } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true });

    // Fetch total bookings
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Fetch pending bookings
    const { count: pendingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Fetch confirmed bookings
    const { count: confirmedCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');

    setStats({
      totalRooms: roomCount || 0,
      totalBookings: bookingCount || 0,
      pendingBookings: pendingCount || 0,
      confirmedBookings: confirmedCount || 0
    });
  };

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setRooms(data);
    }
    setLoading(false);
  };

   const fetchBookings = async () => {
     setLoading(true);
     const { data, error } = await supabase
       .from('bookings')
       .select('*')
       .order('created_at', { ascending: false });

     if (!error && data) {
       setBookings(data);
     }
     setLoading(false);
   };

  const handleCreate = () => {
    setEditingRoom(null);
    setShowModal(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) {
      fetchRooms();
    }
  };

  const handleRoomSaved = () => {
    setShowModal(false);
    setEditingRoom(null);
    fetchRooms();
    fetchStats();
  };

  const handleBookingStatusUpdate = async (bookingId, newStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      fetchBookings();
      fetchStats();
    } else {
      alert('Failed to update booking status');
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

  return (
    <>
      <AdminNavbar />
      
      <div className="admin-dashboard">
        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue">
              <span className="material-symbols-rounded">meeting_room</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.totalRooms}</h3>
              <p>Total Rooms</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon green">
              <span className="material-symbols-rounded">event_available</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.totalBookings}</h3>
              <p>Total Bookings</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon yellow">
              <span className="material-symbols-rounded">schedule</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.pendingBookings}</h3>
              <p>Pending Reviews</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon purple">
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <div className="admin-stat-content">
              <h3>{stats.confirmedBookings}</h3>
              <p>Confirmed Bookings</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
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
                        <th>Category</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id}>
                          <td>
                            {room.image_url ? (
                              <img src={resolveImage(room.image_url)} alt={room.title} className="admin-table-image" />
                            ) : (
                              <div className="no-image-placeholder">
                                <span className="material-symbols-rounded">image</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="room-title-cell">
                              <strong>{room.title}</strong>
                              {room.badge && <span className="room-badge">{room.badge}</span>}
                            </div>
                          </td>
                          <td>
                            <div className="address-cell">
                              <span className="material-symbols-rounded">location_on</span>
                              {room.address || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <span className="price-cell">${room.price.toFixed(2)}</span>
                            <small>/month</small>
                          </td>
                          <td>
                            <div className="room-details-cell">
                              <span><span className="material-symbols-rounded">bed</span> {room.beds || 1}</span>
                              <span><span className="material-symbols-rounded">bathtub</span> {room.baths || 1}</span>
                              <span><span className="material-symbols-rounded">straighten</span> {room.sqft || 0} sqft</span>
                            </div>
                          </td>
                          <td>
                            <span className="category-badge">{room.category || 'N/A'}</span>
                          </td>
                          <td className="admin-actions">
                            <button 
                              className="btn-icon btn-edit" 
                              onClick={() => handleEdit(room)}
                              title="Edit"
                            >
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                            <button 
                              className="btn-icon btn-delete" 
                              onClick={() => handleDelete(room.id)}
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
                               {booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString('en-US', { 
                                 month: 'short', 
                                 day: 'numeric', 
                                 year: 'numeric' 
                               }) : 'N/A'}
                             </div>
                           </td>
                           <td>
                             <span className="price-cell">{booking.total_price ? `$${booking.total_price.toFixed(2)}` : 'Pending'}</span>
                           </td>
                           <td>
                             <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                               {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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

      <AdminFooter />

      {showModal && (
        <AdminRoomModal
          room={editingRoom}
          onSave={handleRoomSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
