import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { resolveImage } from '../lib/images';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AdminRoomModal from '../components/admin/AdminRoomModal.jsx';
import AdminDeleteModal from '../components/admin/AdminDeleteModal.jsx';
import IncomeChart from '../components/landlord/IncomeChart.jsx';
import AddFloorModal from '../components/landlord/AddFloorModal.jsx';
import StudentModal from '../components/landlord/StudentModal.jsx';
import RoomAssignModal from '../components/landlord/RoomAssignModal.jsx';
import BillModal from '../components/landlord/BillModal.jsx';
import BillDetailModal from '../components/landlord/BillDetailModal.jsx';
import BillingConfigModal from '../components/landlord/BillingConfigModal.jsx';
import ManagementFeesModal from '../components/landlord/ManagementFeesModal.jsx';
import ConfirmDeleteModal from '../components/landlord/ConfirmDeleteModal.jsx';
import '../assets/css/admin-dashboard.css';
import landlordCssUrl from '../assets/css/landlord.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import landlordHero from '../assets/images/iispp_international_hall.jpg';
import landlordHeroWebp from '../assets/images/iispp_international_hall.webp';
import landlordHero800Webp from '../assets/images/iispp_international_hall_800w.webp';

function formatPrice(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return 'N/A';
  return `$${num.toFixed(2)}`;
}

function formatTotalPrice(value) {
  const p = formatPrice(value);
  return p === 'N/A' ? 'Pending' : p;
}

function formatStatus(status) {
  switch (status) {
    case 'confirmed': return 'Confirmed';
    case 'cancelled': return 'Cancelled';
    case 'pending': return 'Pending';
    default: return 'Unknown';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'confirmed': return 'll-status-confirmed';
    case 'cancelled': return 'll-status-cancelled';
    case 'pending': return 'll-status-pending';
    default: return '';
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(value) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

const CURRENCY_SYMBOLS = { USD: '$', KHR: '៛', EUR: '€', GBP: '£', THB: '฿', VND: '₫', AUD: 'A$' };

function fmtCurrency(value, currency = 'USD') {
  const num = parseFloat(value);
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  if (!Number.isFinite(num)) return `${symbol}0.00`;
  return `${symbol}${num.toFixed(2)}`;
}

function toDateObj(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKeyOf(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function localDateKey(value) {
  const d = toDateObj(value);
  if (!d) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(value) {
  const d = toDateObj(value);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtMonth(value) {
  const d = toDateObj(value);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(bill) {
  if (!bill || bill.status !== 'issued' || !bill.due_date) return false;
  const dueKey = localDateKey(bill.due_date);
  const todayKey = localDateKey(new Date());
  return !!dueKey && !!todayKey && dueKey < todayKey;
}

function billStatusView(bill) {
  if (isOverdue(bill)) return { cls: 'll-status-overdue', label: 'Overdue' };
  if (bill.status === 'paid') return { cls: 'll-status-confirmed', label: 'Paid' };
  return { cls: 'll-status-pending', label: 'Pending' };
}

function feeView(fee) {
  if (fee.display_status === 'paid') return { cls: 'll-status-confirmed', label: 'Paid' };
  if (fee.display_status === 'overdue') return { cls: 'll-status-overdue', label: 'Overdue' };
  return { cls: 'll-status-pending', label: 'Pending' };
}

const EMPTY_ADDON = { enabled: false, status: 'none', plan: null, activated_at: null, expires_at: null };

const DASHBOARD_METRICS = [
  { key: 'floors', label: 'Total Floors', icon: 'stairs', cls: 'll-metric-icon-blue' },
  { key: 'totalRooms', label: 'Total Rooms', icon: 'meeting_room', cls: 'll-metric-icon-blue' },
  { key: 'availableRooms', label: 'Available Rooms', icon: 'check_circle', cls: 'll-metric-icon-teal' },
  { key: 'occupiedRooms', label: 'Occupied Rooms', icon: 'home_work', cls: 'll-metric-icon-blue' },
  { key: 'occupancyRate', label: 'Occupancy Rate', icon: 'donut_large', cls: 'll-metric-icon-cyan', suffix: '%' },
  { key: 'students', label: 'Total Students', icon: 'groups', cls: 'll-metric-icon-blue' },
  { key: 'pendingBills', label: 'Pending Bills', icon: 'receipt_long', cls: 'll-metric-icon-cyan' },
  { key: 'overdueBills', label: 'Overdue Bills', icon: 'warning', cls: 'll-metric-icon-error' },
];

const EMPTY_DASHBOARD = {
  metrics: { floors: 0, totalRooms: 0, availableRooms: 0, occupiedRooms: 0, occupancyRate: 0, students: 0, pendingBills: 0, overdueBills: 0 },
  incomeTrend: [],
  currentMonthIncome: { expected: 0, collected: 0 },
  recentBills: [],
};

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'rooms', label: 'Listings', icon: 'meeting_room' },
  { key: 'bookings', label: 'Bookings', icon: 'event_available' },
  { key: 'students', label: 'Students', icon: 'groups' },
  { key: 'floors', label: 'Floors', icon: 'stairs' },
  { key: 'bills', label: 'Bills', icon: 'receipt_long' },
  { key: 'fees', label: 'Mgmt Fees', icon: 'request_quote' },
];

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [floors, setFloors] = useState([]);
  const [bills, setBills] = useState([]);
  const [fees, setFees] = useState([]);
  const [addon, setAddon] = useState(EMPTY_ADDON);
  const [feeModal, setFeeModal] = useState(false);
  const [feeRoomId, setFeeRoomId] = useState(null);
  const [addonBusy, setAddonBusy] = useState(false);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [assignMap, setAssignMap] = useState({});
  const [studentAssignMap, setStudentAssignMap] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);

  const [floorModal, setFloorModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [floorSearch, setFloorSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatus, setRoomStatus] = useState('all');
  const [assignCreateRoom, setAssignCreateRoom] = useState(null);
  const [studentModal, setStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentTypeFilter, setStudentTypeFilter] = useState('all');
  const [studentRoomFilter, setStudentRoomFilter] = useState('all');
  const [billModal, setBillModal] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [billStudentId, setBillStudentId] = useState(null);
  const [billingConfig, setBillingConfig] = useState({ configured: false });
  const [configModal, setConfigModal] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const visibleBillsRef = useRef([]);

  usePageStylesheet(landlordCssUrl);

  useEffect(() => {
    loadForTab(activeTab);
  }, [activeTab]);

  // Only clear the toast timer on unmount; clearing it on every tab change
  // would cancel the auto-hide of a toast shown moments before the switch.
  // showToast already clears any pending timer when scheduling a new one.
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    if (activeTab !== 'students') return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (studentTypeFilter !== 'all') params.set('type', studentTypeFilter);
    if (studentRoomFilter !== 'all') params.set('room', studentRoomFilter);
    const q = studentSearch.trim();
    if (q) params.set('q', q);
    (async () => {
      try {
        const data = await api.get(`/api/landlord/students${params.toString() ? `?${params}` : ''}`);
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, studentTypeFilter, studentRoomFilter, studentSearch]);

  // Reload bills whenever the status/student filters change, instead of
  // fetching inside the click handlers with a stale filter value (which would
  // show the previous filter's data until the next manual reload).
  useEffect(() => {
    if (activeTab !== 'bills') return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (billStatusFilter !== 'all') params.set('status', billStatusFilter);
        if (billStudentId) params.set('student_id', String(billStudentId));
        const [billList, studentList, roomList, cfg] = await Promise.all([
          api.get(`/api/landlord/bills${params.toString() ? `?${params}` : ''}`),
          api.get('/api/landlord/students'),
          api.get('/api/landlord/rooms'),
          api.get('/api/landlord/billing-config'),
        ]);
        if (!cancelled) {
          setBills(Array.isArray(billList) ? billList : []);
          setStudents(Array.isArray(studentList) ? studentList : []);
          setRooms(Array.isArray(roomList) ? roomList : []);
          setBillingConfig(cfg || { configured: false });
        }
      } catch (err) {
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, billStatusFilter, billStudentId]);

  // Same pattern for the fees room filter.
  useEffect(() => {
    if (activeTab !== 'fees') return;
    let cancelled = false;
    (async () => {
      try {
        const roomParam = feeRoomId ? `?room_id=${feeRoomId}` : '';
        const [feeList, addonRes, roomList] = await Promise.all([
          api.get(`/api/landlord/management-fees${roomParam}`),
          api.get('/api/landlord/management-fees/addon'),
          api.get('/api/landlord/rooms'),
        ]);
        if (!cancelled) {
          setFees(Array.isArray(feeList) ? feeList : []);
          setAddon(addonRes || EMPTY_ADDON);
          setRooms(Array.isArray(roomList) ? roomList : []);
        }
      } catch (err) {
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, feeRoomId]);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  };

  const startLoad = () => {
    setLoading(true);
    setLoadError('');
  };

  const loadForTab = (tab) => {
    if (tab === 'dashboard') {
      loadDashboard();
    } else if (tab === 'rooms') {
      loadRooms(true);
    } else if (tab === 'bookings') {
      loadBookings();
    } else if (tab === 'students') {
      loadStudents(true);
    } else if (tab === 'floors') {
      loadFloors(true);
    } else if (tab === 'bills') {
      loadBills();
    } else if (tab === 'fees') {
      loadFees();
    }
  };

  const loadDashboard = async () => {
    startLoad();
    try {
      const [dash, roomList] = await Promise.all([
        api.get('/api/landlord/dashboard'),
        api.get('/api/landlord/rooms'),
      ]);
      setDashboard({
        metrics: dash.metrics,
        incomeTrend: dash.incomeTrend || [],
        currentMonthIncome: dash.currentMonthIncome || { expected: 0, collected: 0 },
        recentBills: dash.recentBills || [],
      });
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setLoadError(err?.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (main = false) => {
    if (main) startLoad();
    try {
      const [roomList, floorList, studentList] = await Promise.all([
        api.get('/api/landlord/rooms'),
        api.get('/api/landlord/floors'),
        api.get('/api/landlord/students'),
      ]);
      setRooms(Array.isArray(roomList) ? roomList : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setFloors(Array.isArray(floorList) ? floorList : []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      if (main) setLoadError(err?.message || 'Failed to load your rooms.');
    } finally {
      if (main) setLoading(false);
    }
  };

  const loadBookings = async () => {
    startLoad();
    try {
      const data = await api.get('/api/landlord/bookings');
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setLoadError(err?.message || 'Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRooms = async () => {
    try {
      const roomList = await api.get('/api/landlord/rooms');
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      console.error('Failed to refresh rooms:', err);
    }
  };

  const loadStudents = async (main = false) => {
    if (main) startLoad();
    try {
      const params = new URLSearchParams();
      if (studentTypeFilter !== 'all') params.set('type', studentTypeFilter);
      if (studentRoomFilter !== 'all') params.set('room', studentRoomFilter);
      const search = studentSearch.trim();
      if (search) params.set('q', search);
      const data = await api.get(`/api/landlord/students${params.toString() ? `?${params}` : ''}`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load students:', err);
      if (main) setLoadError(err?.message || 'Failed to load your students.');
    } finally {
      if (main) setLoading(false);
    }
  };

  const loadFloors = async (main = false) => {
    if (main) startLoad();
    try {
      const data = await api.get('/api/landlord/floors');
      setFloors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load floors:', err);
      if (main) setLoadError(err?.message || 'Failed to load your floors.');
    } finally {
      if (main) setLoading(false);
    }
  };

  const loadBills = async () => {
    startLoad();
    try {
      const params = new URLSearchParams();
      if (billStatusFilter !== 'all') params.set('status', billStatusFilter);
      if (billStudentId) params.set('student_id', String(billStudentId));
      const [billList, studentList, roomList, cfg] = await Promise.all([
        api.get(`/api/landlord/bills${params.toString() ? `?${params}` : ''}`),
        api.get('/api/landlord/students'),
        api.get('/api/landlord/rooms'),
        api.get('/api/landlord/billing-config'),
      ]);
      setBills(Array.isArray(billList) ? billList : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setRooms(Array.isArray(roomList) ? roomList : []);
      setBillingConfig(cfg || { configured: false });
    } catch (err) {
      console.error('Failed to load bills:', err);
      setLoadError(err?.message || 'Failed to load your bills.');
    } finally {
      setLoading(false);
    }
  };

  const loadFees = async (main = true) => {
    if (main) startLoad();
    try {
      const roomParam = feeRoomId ? `?room_id=${feeRoomId}` : '';
      const [feeList, addonRes, roomList] = await Promise.all([
        api.get(`/api/landlord/management-fees${roomParam}`),
        api.get('/api/landlord/management-fees/addon'),
        api.get('/api/landlord/rooms'),
      ]);
      setFees(Array.isArray(feeList) ? feeList : []);
      setAddon(addonRes || EMPTY_ADDON);
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      console.error('Failed to load management fees:', err);
      if (main) setLoadError(err?.message || 'Failed to load your management fees.');
    } finally {
      if (main) setLoading(false);
    }
  };

  const ensureStudentsRooms = async () => {
    try {
      const [studentList, roomList] = await Promise.all([
        students.length ? null : api.get('/api/landlord/students'),
        rooms.length ? null : api.get('/api/landlord/rooms'),
      ]);
      if (studentList) setStudents(Array.isArray(studentList) ? studentList : []);
      if (roomList) setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      console.error('Failed to load student/room options:', err);
    }
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setShowModal(true);
    if (floors.length === 0) loadFloors();
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowModal(true);
    if (floors.length === 0) loadFloors();
  };

  const handleDeleteClick = (room) => {
    setDeletingRoom(room);
  };

  const confirmDeleteRoom = async (room) => {
    try {
      await api.del(`/api/landlord/rooms/${room.id}`);
      setDeletingRoom(null);
      loadForTab(activeTab);
      showToast(`Room "${room.title}" was deleted`);
    } catch (err) {
      console.error('Failed to delete room:', err);
      throw err;
    }
  };

  const handleRoomSaved = () => {
    setShowModal(false);
    setEditingRoom(null);
    setActiveTab('rooms');
    loadForTab('rooms');
  };

  const handleAssignCreateSaved = () => {
    setAssignCreateRoom(null);
    setActiveTab('rooms');
    loadForTab('rooms');
    showToast('Student created and assigned to the room.');
  };

  const handleBookingStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.patch(`/api/landlord/bookings/${bookingId}`, { status: newStatus });
      loadBookings();
      showToast(`Booking marked as ${formatStatus(newStatus)}.`);
    } catch (err) {
      console.error('Failed to update booking status:', err);
      showToast("Couldn't update the booking status — please try again.");
    }
  };

  const openAddFloor = () => {
    setEditingFloor(null);
    setFloorModal(true);
  };

  const openEditFloor = (floor) => {
    setEditingFloor(floor);
    setFloorModal(true);
  };

  const handleFloorSaved = () => {
    setFloorModal(false);
    setEditingFloor(null);
    loadForTab(activeTab);
    showToast(editingFloor ? 'Floor updated.' : 'Floor added.');
  };

  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentModal(true);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setStudentModal(true);
  };

  const handleStudentSaved = () => {
    setStudentModal(false);
    setEditingStudent(null);
    loadForTab(activeTab);
    showToast('Student saved.');
  };

  const openIssueBill = async () => {
    await ensureStudentsRooms();
    setBillModal(true);
  };

  const handleBillSaved = () => {
    setBillModal(false);
    loadForTab(activeTab);
    showToast('Bill issued.');
  };

  const openFeesForRoom = (room) => {
    setFeeRoomId(room.id);
    setActiveTab('fees');
  };

  const openCreateFee = () => {
    if (!addon.enabled) {
      showToast('Activate the Management Fees add-on before creating invoices.');
      return;
    }
    setFeeModal(true);
  };

  const handleFeeSaved = () => {
    setFeeModal(false);
    loadForTab('fees');
    showToast('Management fee created.');
  };

  const subscribeAddon = async (plan) => {
    setAddonBusy(true);
    try {
      await api.post('/api/landlord/management-fees/addon', { plan });
      await loadFees(false);
      showToast(`Management Fees activated (${plan === 'yearly' ? 'yearly' : 'monthly'}).`);
    } catch (err) {
      console.error('Failed to subscribe:', err);
      showToast("Couldn't activate the add-on. Please try again.");
    } finally {
      setAddonBusy(false);
    }
  };

  const requestCancelAddon = () => {
    setConfirmDelete({
      kind: 'Add-on',
      title: 'Management Fees add-on',
      message: 'Cancelling stops you from creating new invoices. Existing invoices stay readable, and you can re-subscribe any time.',
      run: async () => {
        await api.post('/api/landlord/management-fees/addon/cancel');
        setConfirmDelete(null);
        loadForTab('fees');
        showToast('Add-on subscription cancelled.');
      },
    });
  };

  const requestDeleteFee = (fee) => {
    setConfirmDelete({
      kind: 'Fee',
      title: `${fmtCurrency(fee.total, fee.currency)} invoice${fee.room_title ? ` — ${fee.room_title}` : ''}`,
      message: 'This will permanently delete the invoice. This action cannot be undone.',
      run: async () => {
        await api.del(`/api/landlord/management-fees/${fee.id}`);
        setConfirmDelete(null);
        loadForTab(activeTab);
        showToast('Invoice deleted.');
      },
    });
  };

  const handleAssign = async (room) => {
    const studentId = assignMap[room.id];
    if (!studentId) return;
    try {
      await api.patch(`/api/landlord/rooms/${room.id}/assign`, { student_id: Number(studentId) });
      setAssignMap((prev) => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
      loadForTab('rooms');
      showToast('Student assigned to room.');
    } catch (err) {
      console.error('Failed to assign student:', err);
      showToast('Could not assign the student. Please try again.');
    }
  };

  const handleUnassign = async (room) => {
    try {
      await api.patch(`/api/landlord/rooms/${room.id}/unassign`);
      loadForTab('rooms');
      showToast('Room released.');
    } catch (err) {
      console.error('Failed to unassign student:', err);
      showToast('Could not release the room. Please try again.');
    }
  };

  const handleStudentAssign = async (student, roomId) => {
    if (!roomId) return;
    try {
      await api.patch(`/api/landlord/rooms/${roomId}/assign`, { student_id: Number(student.id) });
      setStudentAssignMap((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      await refreshRooms();
      loadForTab('students');
      showToast(`${student.full_name} assigned to a room.`);
    } catch (err) {
      console.error('Failed to assign student:', err);
      showToast(`Could not assign ${student.full_name}. ${err?.message || 'Please try again.'}`);
    }
  };

  const requestDeleteStudent = (student) => {
    setConfirmDelete({
      kind: 'Student',
      title: student.full_name,
      message: 'This will permanently remove the student and free any room they occupy. This action cannot be undone.',
      run: async () => {
        await api.del(`/api/landlord/students/${student.id}`);
        setConfirmDelete(null);
        loadForTab(activeTab);
        showToast('Student deleted.');
      },
    });
  };

  const requestDeleteFloor = (floor) => {
    const roomCount = floor.room_count || 0;
    setConfirmDelete({
      kind: 'Floor',
      title: floor.label,
      message: `This permanently deletes "${floor.label}" and every room on it${roomCount ? ` (${roomCount} room${roomCount === 1 ? '' : 's'})` : ''}. Bookings stay but are unlinked from their rooms. If you want to keep any rooms, move them to another floor or clear them first. This action cannot be undone.`,
      run: async () => {
        await api.del(`/api/landlord/floors/${floor.id}`);
        setConfirmDelete(null);
        loadForTab(activeTab);
        showToast('Floor deleted.');
      },
    });
  };

  const requestDeleteBill = (bill) => {
    setConfirmDelete({
      kind: 'Bill',
      title: `${fmtMonth(bill.period)} bill`,
      message: 'This will permanently delete the bill. This action cannot be undone.',
      run: async () => {
        await api.del(`/api/landlord/bills/${bill.id}`);
        setConfirmDelete(null);
        loadForTab(activeTab);
        showToast('Bill deleted.');
      },
    });
  };

  const requestRemoveStudentFromRoom = (student) => {
    setConfirmDelete({
      kind: 'Assignment',
      title: student.full_name,
      message: `Move ${student.full_name} out of "${student.room_title}"? The room becomes available and their bills stay on record.`,
      run: async () => {
        await api.patch(`/api/landlord/rooms/${student.room_id}/unassign`);
        setConfirmDelete(null);
        await refreshRooms();
        loadForTab('students');
        showToast(`${student.full_name} was removed from the room.`);
      },
    });
  };

  const openManageBills = (student) => {
    setBillStudentId(student.id);
    setBillStatusFilter('all');
    setActiveTab('bills');
  };

  const handleGenerateBills = async () => {
    setGenerateBusy(true);
    try {
      const res = await api.post('/api/landlord/bills/generate', { period: monthKeyOf(new Date()) });
      setConfirmDelete(null);
      loadForTab('bills');
      showToast(res?.skipped > 0
        ? `Generated ${res.created} bill${res.created === 1 ? '' : 's'} for ${fmtMonth(res.period)} (skipped ${res.skipped} already billed).`
        : `Generated ${res.created} bill${res.created === 1 ? '' : 's'} for ${fmtMonth(res.period)}.`);
    } catch (err) {
      if (/Billing is not set up/i.test(err?.message || '')) {
        setConfigModal(true);
      } else {
        showToast(err?.message || 'Could not generate bills. Please try again.');
      }
    } finally {
      setGenerateBusy(false);
    }
  };

  const handleConfigSaved = () => {
    setConfigModal(false);
    loadForTab('bills');
    showToast('Billing config saved.');
  };

  const exportBillsPDF = () => {
    const rows = visibleBillsRef.current || [];
    const w = window.open('', '_blank');
    if (!w) {
      showToast('Your browser blocked the export window — allow pop-ups and try again.');
      return;
    }
    const safe = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const trs = rows.map((bill) => {
      const view = billStatusView(bill);
      return `<tr>
        <td>${safe(fmtMonth(bill.period))}</td>
        <td>${safe(bill.student_name || '—')}</td>
        <td>${safe(bill.room_title || '—')}</td>
        <td>${safe(fmtMoney(bill.amount))}</td>
        <td>${safe(view.label)}</td>
        <td>${safe(fmtDate(bill.due_date))}</td>
      </tr>`;
    }).join('');
    const home = (billingConfig.configured && billingConfig.home_name) || 'Niset Stay';
    w.document.write(`<!doctype html><html><head><title>Bills report</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 40px;color:#101820}
        h1{font-size:20px;margin:0 0 4px} p.sub{color:#5b6470;margin:0 0 24px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{text-align:left;border-bottom:2px solid #101820;padding:8px 10px}
        td{border-bottom:1px solid #dce3ea;padding:8px 10px}
        tr:last-child td{border-bottom:none}
        .right{text-align:right}
      </style></head><body>
      <h1>${safe(home)} — Bills report</h1>
      <p class="sub">Generated ${new Date().toLocaleString()} · ${rows.length} bill${rows.length === 1 ? '' : 's'}</p>
      <table><thead><tr><th>Bill</th><th>Student</th><th>Room</th><th class="right">Amount</th><th>Status</th><th>Due</th></tr></thead>
      <tbody>${trs || '<tr><td colspan="6">No bills to export.</td></tr>'}</tbody></table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const renderErrorState = () => (
    <div className="ll-state">
      <span className="ll-state-icon material-symbols-rounded">cloud_off</span>
      <h3>Couldn't load this section</h3>
      <p>{loadError}</p>
      <button
        type="button"
        className="ll-btn ll-btn-primary"
        onClick={() => loadForTab(activeTab)}
      >
        <span className="material-symbols-rounded">refresh</span>
        Try Again
      </button>
    </div>
  );

  const renderRoomsSkeleton = () => (
    <div className="ll-portfolio" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="ll-prop ll-prop-skel" key={i}>
          <div className="ll-skel ll-skel-media" />
          <div className="ll-prop-body">
            <div className="ll-skel ll-skel-line" style={{ width: '70%' }} />
            <div className="ll-skel ll-skel-line" style={{ width: '46%' }} />
            <div className="ll-skel ll-skel-line" style={{ width: '58%' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderQueueSkeleton = () => (
    <div className="ll-queue" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="ll-queue-row ll-queue-skel" key={i}>
          <div className="ll-skel ll-skel-avatar" />
          <div className="ll-skel ll-skel-line" style={{ width: '55%' }} />
          <div className="ll-skel ll-skel-line" style={{ width: '40%' }} />
          <div className="ll-skel ll-skel-line" style={{ width: '30%' }} />
          <div className="ll-skel ll-skel-chip" />
        </div>
      ))}
    </div>
  );

  const renderDashboard = () => {
    const { metrics, incomeTrend, currentMonthIncome, recentBills } = dashboard;

    return (
      <div className="ll-dashboard">
        <div className="ll-metrics" aria-label="Your property at a glance">
          {DASHBOARD_METRICS.map((metric) => (
            <div className="ll-metric" key={metric.key}>
              <span className={`ll-metric-icon ${metric.cls}`}>
                <span className="material-symbols-rounded">{metric.icon}</span>
              </span>
              <div className="ll-metric-copy">
                <span className="ll-metric-label">{metric.label}</span>
                <strong className="ll-metric-value">
                  {metrics[metric.key]}{metric.suffix || ''}
                </strong>
              </div>
            </div>
          ))}
        </div>

        <div className="ll-dash-grid">
          <div className="ll-panel">
            <div className="ll-panel-head">
              <h3>Monthly Income</h3>
              <span className="ll-panel-sub">Expected vs collected · last 6 months</span>
            </div>
            <IncomeChart data={incomeTrend} />
            <div className="ll-month-income">
              <div className="ll-month-tile">
                <span className="ll-month-label">Expected this month</span>
                <strong>{fmtMoney(currentMonthIncome.expected)}</strong>
              </div>
              <div className="ll-month-tile ll-month-tile-collected">
                <span className="ll-month-label">Collected this month</span>
                <strong>{fmtMoney(currentMonthIncome.collected)}</strong>
              </div>
            </div>
          </div>

          <div className="ll-panel">
            <div className="ll-panel-head">
              <h3>Quick Actions</h3>
              <span className="ll-panel-sub">Jump straight to a task</span>
            </div>
            <div className="ll-quick-actions">
              <button type="button" className="ll-quick" onClick={openAddFloor}>
                <span className="ll-quick-icon material-symbols-rounded">stairs</span>
                <span><strong>Add Floor</strong><small>Create a new level</small></span>
              </button>
              <button type="button" className="ll-quick" onClick={handleCreate}>
                <span className="ll-quick-icon material-symbols-rounded">meeting_room</span>
                <span><strong>Add Room</strong><small>List a new room</small></span>
              </button>
              <button type="button" className="ll-quick" onClick={openAddStudent}>
                <span className="ll-quick-icon material-symbols-rounded">person_add</span>
                <span><strong>Add Student</strong><small>Register a student</small></span>
              </button>
              <button type="button" className="ll-quick" onClick={openIssueBill}>
                <span className="ll-quick-icon material-symbols-rounded">receipt_long</span>
                <span><strong>Issue Bill</strong><small>Create a monthly bill</small></span>
              </button>
              <button type="button" className="ll-quick" onClick={() => setActiveTab('fees')}>
                <span className="ll-quick-icon material-symbols-rounded">request_quote</span>
                <span><strong>Mgmt Fees</strong><small>Invoice room owners</small></span>
              </button>
            </div>
          </div>
        </div>

        <div className="ll-panel">
          <div className="ll-panel-head">
            <h3>Recent Bills</h3>
            <span className="ll-panel-sub">Latest activity on your bills</span>
          </div>
          {recentBills.length === 0 ? (
            <div className="ll-state ll-state-compact">
              <span className="ll-state-icon material-symbols-rounded">receipt</span>
              <h3>No bills yet</h3>
              <p>Issue your first bill to start tracking this month's income.</p>
              <button type="button" className="ll-btn ll-btn-primary" onClick={openIssueBill}>
                <span className="material-symbols-rounded">receipt_long</span>
                Issue a Bill
              </button>
            </div>
          ) : (
            <div className="ll-queue ll-bill-queue">
              <div className="ll-queue-head" aria-hidden="true">
                <span>Bill</span>
                <span>Student</span>
                <span>Room</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {recentBills.map((bill) => {
                const view = billStatusView(bill);
                return (
                  <div className="ll-queue-row" key={bill.id}>
                    <div className="ll-queue-date ll-bill-period">
                      <span className="material-symbols-rounded">calendar_month</span>
                      <span>
                        <strong>{fmtMonth(bill.period)}</strong>
                        <small>Due {fmtDate(bill.due_date)}</small>
                      </span>
                    </div>
                    <div className="ll-queue-room">
                      <strong>{bill.student_name || 'Not linked'}</strong>
                    </div>
                    <div className="ll-queue-room">
                      <strong>{bill.room_title || 'Not linked'}</strong>
                    </div>
                    <div className="ll-queue-total">
                      <strong>{fmtMoney(bill.amount)}</strong>
                    </div>
                    <span className={`ll-status ${view.cls}`}>{view.label}</span>
                    <div className="ll-queue-actions">
                      <button type="button" className="ll-action ll-action-reject" onClick={() => setViewBill(bill)}>
                        <span className="material-symbols-rounded">visibility</span>
                        View
                      </button>
                      {bill.status === 'issued' && (
                        <button
                          type="button"
                          className="ll-action ll-action-approve"
                          onClick={async () => {
                            const who = bill.student_name || bill.room_title || 'this bill';
                            if (!window.confirm(
                              `Mark the bill for ${who} as paid? This records the payment and cannot be undone.`
                            )) return;
                            try {
                              await api.patch(`/api/landlord/bills/${bill.id}/mark-paid`);
                              loadForTab(activeTab);
                              showToast('Bill marked as paid.');
                            } catch (err) {
                              showToast('Could not update the bill. Please try again.');
                            }
                          }}
                        >
                          <span className="material-symbols-rounded">payments</span>
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRoomsToolbar = () => (
    <div className="ll-room-toolbar">
      <div className="ll-status-seg" role="group" aria-label="Filter rooms by status">
        {[
          { key: 'all', label: 'All' },
          { key: 'vacant', label: 'Vacant' },
          { key: 'occupied', label: 'Occupied' },
        ].map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`ll-seg-btn${roomStatus === filter.key ? ' active' : ''}`}
            aria-pressed={roomStatus === filter.key}
            onClick={() => setRoomStatus(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="ll-room-search">
        <span className="material-symbols-rounded">search</span>
        <input
          type="search"
          placeholder="Search rooms by name…"
          value={roomSearch}
          onChange={(e) => setRoomSearch(e.target.value)}
          aria-label="Search rooms by name"
        />
      </div>
    </div>
  );

  const renderRooms = () => {
    const query = roomSearch.trim().toLowerCase();
    const filteredRooms = rooms.filter((room) => {
      if (floorFilter && room.floor_id !== floorFilter) return false;
      if (roomStatus === 'vacant' && room.status === 'occupied') return false;
      if (roomStatus === 'occupied' && room.status !== 'occupied') return false;
      if (query && !room.title.toLowerCase().includes(query)) return false;
      return true;
    });
    const activeFloor = floorFilter ? floors.find((f) => f.id === floorFilter) : null;
    const unassignedStudents = students.filter((s) => !s.room_id);

    if (rooms.length === 0) {
      return (
        <div className="ll-state">
          <span className="ll-state-icon material-symbols-rounded">inventory_2</span>
          <h3>Build your portfolio</h3>
          <p>Add your first room so students can find your property and start sending booking requests.</p>
          <button className="ll-btn ll-btn-primary" onClick={handleCreate}>
            <span className="material-symbols-rounded">add</span>
            Add Room
          </button>
        </div>
      );
    }

    if (filteredRooms.length === 0) {
      const filtersActive = roomStatus !== 'all' || query;
      return (
        <>
          {activeFloor && (
            <div className="ll-filter-chip" role="status">
              <span className="material-symbols-rounded">stairs</span>
              Showing rooms on <strong>{activeFloor.label}</strong>
              <button type="button" onClick={() => setFloorFilter(null)}>
                Clear
              </button>
            </div>
          )}
          {renderRoomsToolbar()}
          <div className="ll-state">
            <span className="ll-state-icon material-symbols-rounded">search_off</span>
            {activeFloor && !filtersActive ? (
              <>
                <h3>No rooms on {activeFloor.label}</h3>
                <p>Assign a room to this floor from the room editor, or pick another floor.</p>
                <button className="ll-btn ll-btn-primary" onClick={() => setFloorFilter(null)}>
                  <span className="material-symbols-rounded">close</span>
                  Show all rooms
                </button>
              </>
            ) : (
              <>
                <h3>No rooms match your filters</h3>
                <p>Try a different search term or status, or show every room again.</p>
                <button
                  className="ll-btn ll-btn-primary"
                  onClick={() => { setRoomSearch(''); setRoomStatus('all'); setFloorFilter(null); }}
                >
                  <span className="material-symbols-rounded">close</span>
                  Show all rooms
                </button>
              </>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {activeFloor && (
          <div className="ll-filter-chip" role="status">
            <span className="material-symbols-rounded">stairs</span>
            Showing rooms on <strong>{activeFloor.label}</strong>
            <button type="button" onClick={() => setFloorFilter(null)}>
              Clear
            </button>
          </div>
        )}
        {renderRoomsToolbar()}
        <div className="ll-portfolio">
          {filteredRooms.map((room) => (
          <article className="ll-prop" key={room.id}>
            <div className="ll-prop-media">
              {room.image_url ? (
                <img src={resolveImage(room.image_url)} alt={room.title} loading="lazy" />
              ) : (
                <span className="ll-prop-placeholder material-symbols-rounded">image</span>
              )}
              {room.badge && <span className="ll-prop-chip">{room.badge}</span>}
              <span className="ll-room-tag ll-room-tag-status">
                <span className="material-symbols-rounded">{room.status === 'occupied' ? 'person_pin' : 'cottage'}</span>
                {room.status === 'occupied' ? (room.student_name || 'Occupied') : 'Vacant'}
              </span>
              <span className="ll-prop-pricebar">
                <strong className="ll-prop-price">{formatPrice(room.price)}</strong>
                <span className="ll-prop-priceper">/month</span>
              </span>
              <div className="ll-prop-actions">
                <button
                  type="button"
                  className="ll-prop-action ll-fees"
                  onClick={() => openFeesForRoom(room)}
                  title={`Fees for ${room.title}`}
                  aria-label={`Management fees for ${room.title}`}
                >
                  <span className="material-symbols-rounded">request_quote</span>
                </button>
                <button
                  type="button"
                  className="ll-prop-action ll-edit"
                  onClick={() => handleEdit(room)}
                  title={`Edit ${room.title}`}
                  aria-label={`Edit ${room.title}`}
                >
                  <span className="material-symbols-rounded">edit</span>
                </button>
                <button
                  type="button"
                  className="ll-prop-action ll-delete"
                  onClick={() => handleDeleteClick(room)}
                  title={`Delete ${room.title}`}
                  aria-label={`Delete ${room.title}`}
                >
                  <span className="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>

            <div className="ll-prop-body">
              <h3 className="ll-prop-title">{room.title}</h3>
              <p className="ll-prop-address">
                <span className="material-symbols-rounded">location_on</span>
                {room.address || 'Address not set'}
              </p>
              <div className="ll-prop-meta">
                <span>
                  <span className="material-symbols-rounded">bed</span>
                  {room.beds || 1}
                </span>
                <span className="ll-prop-sep" />
                <span>
                  <span className="material-symbols-rounded">bathtub</span>
                  {room.baths || 1}
                </span>
                <span className="ll-prop-sep" />
                <span>
                  <span className="material-symbols-rounded">straighten</span>
                  {room.sqft || 0} sqft
                </span>
              </div>

              <div className="ll-prop-tags">
                {room.floor_label && (
                  <span className="ll-room-tag ll-room-tag-floor">
                    <span className="material-symbols-rounded">stairs</span>
                    {room.floor_label}
                  </span>
                )}
              </div>
            </div>

            <div className="ll-studentbar">
              {room.status === 'occupied' ? (
                <>
                  <span className="ll-student-chip">
                    <span className="material-symbols-rounded">person</span>
                    {room.student_name || 'Assigned student'}
                  </span>
                  <button type="button" className="ll-assign-btn ll-assign-btn-ghost" onClick={() => handleUnassign(room)}>
                    <span className="material-symbols-rounded">undo</span>
                    Remove Student
                  </button>
                </>
              ) : (
                <>
                  <select
                    className="ll-assign-select"
                    value={assignMap[room.id] || ''}
                    onChange={(e) => setAssignMap((prev) => ({ ...prev, [room.id]: e.target.value }))}
                    aria-label={`Assign a student to ${room.title}`}
                    disabled={unassignedStudents.length === 0}
                  >
                    <option value="">
                      {unassignedStudents.length === 0 ? 'All students have rooms' : 'Assign a student…'}
                    </option>
                    {unassignedStudents.map((student) => (
                      <option value={student.id} key={student.id}>{student.full_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ll-assign-btn"
                    disabled={!assignMap[room.id]}
                    onClick={() => handleAssign(room)}
                  >
                    <span className="material-symbols-rounded">person_add</span>
                    Assign
                  </button>
                  <button
                    type="button"
                    className="ll-assign-btn ll-assign-btn-ghost"
                    onClick={() => setAssignCreateRoom(room)}
                  >
                    <span className="material-symbols-rounded">add</span>
                    New Student
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        </div>
      </>
    );
  };

  const renderBookings = () => {
    if (bookings.length === 0) {
      return (
        <div className="ll-state">
          <span className="ll-state-icon material-symbols-rounded">event_busy</span>
          <h3>No booking requests yet</h3>
          <p>Once students reserve one of your rooms, requests will show up here for you to approve or reject.</p>
        </div>
      );
    }

    return (
      <div className="ll-queue">
        <div className="ll-queue-head" aria-hidden="true">
          <span>Student</span>
          <span>Room</span>
          <span>Move-in</span>
          <span>Status</span>
          <span>Total</span>
          <span>Actions</span>
        </div>
        {bookings.map((booking) => (
          <div className="ll-queue-row" key={booking.id}>
            <div className="ll-student">
              <span className="ll-student-avatar">{getInitials(booking.full_name)}</span>
              <div className="ll-student-info">
                <strong>{booking.full_name || 'N/A'}</strong>
                <small>
                  <span className="material-symbols-rounded">phone</span>
                  {booking.phone || 'No phone'}
                </small>
              </div>
            </div>

            <div className="ll-queue-room">
              <strong>{booking.room_title || 'N/A'}</strong>
            </div>

            <div className="ll-queue-date">
              <span className="material-symbols-rounded">login</span>
              {formatDate(booking.move_in)}
            </div>

            <span className={`ll-status ${getStatusBadgeClass(booking.status)}`}>
              {formatStatus(booking.status)}
            </span>

            <div className="ll-queue-total">
              <strong>{formatTotalPrice(booking.total_price)}</strong>
            </div>

            <div className="ll-queue-actions">
              {booking.status === 'pending' && (
                <>
                  <button
                    className="ll-action ll-action-approve"
                    onClick={() => handleBookingStatusUpdate(booking.id, 'confirmed')}
                  >
                    <span className="material-symbols-rounded">check_circle</span>
                    Approve
                  </button>
                  <button
                    className="ll-action ll-action-reject"
                    onClick={() => handleBookingStatusUpdate(booking.id, 'cancelled')}
                  >
                    <span className="material-symbols-rounded">cancel</span>
                    Reject
                  </button>
                </>
              )}
              {booking.status === 'confirmed' && (
                <button
                  className="ll-action ll-action-cancel"
                  onClick={() => handleBookingStatusUpdate(booking.id, 'cancelled')}
                >
                  <span className="material-symbols-rounded">block</span>
                  Cancel
                </button>
              )}
              {booking.status === 'cancelled' && (
                <span className="ll-queue-none">No actions</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStudents = () => {
    const vacantRooms = rooms.filter((r) => r.status !== 'occupied');
    const filtersActive = studentTypeFilter !== 'all' || studentRoomFilter !== 'all' || Boolean(studentSearch.trim());

    const renderStudentToolbar = () => (
      <div className="ll-students-toolbar">
        <div className="ll-status-seg" role="group" aria-label="Filter students by type">
          {[
            { key: 'all', label: 'All' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'daily', label: 'Daily' },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`ll-seg-btn${studentTypeFilter === filter.key ? ' active' : ''}`}
              aria-pressed={studentTypeFilter === filter.key}
              onClick={() => setStudentTypeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="ll-student-room-filter">
          <span className="material-symbols-rounded">filter_alt</span>
          <select
            value={studentRoomFilter}
            onChange={(e) => setStudentRoomFilter(e.target.value)}
            aria-label="Filter students by room assignment"
          >
            <option value="all">All rooms</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <div className="ll-room-search">
          <span className="material-symbols-rounded">search</span>
          <input
            type="search"
            placeholder="Search students by name…"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            aria-label="Search students by name"
          />
        </div>
      </div>
    );

    if (students.length === 0 && filtersActive) {
      return (
        <>
          {renderStudentToolbar()}
          <div className="ll-state">
            <span className="ll-state-icon material-symbols-rounded">search_off</span>
            <h3>No students match your filters</h3>
            <p>Try a different search or clear the room/type filters.</p>
            <button
              type="button"
              className="ll-btn ll-btn-primary"
              onClick={() => { setStudentSearch(''); setStudentTypeFilter('all'); setStudentRoomFilter('all'); }}
            >
              <span className="material-symbols-rounded">filter_alt_off</span>
              Clear Filters
            </button>
          </div>
        </>
      );
    }

    if (students.length === 0) {
      return (
        <div className="ll-state">
          <span className="ll-state-icon material-symbols-rounded">groups</span>
          <h3>No students registered</h3>
          <p>Add your students here, then assign them to rooms so occupancy and bills stay in sync.</p>
          <button className="ll-btn ll-btn-primary" onClick={openAddStudent}>
            <span className="material-symbols-rounded">add</span>
            Add Student
          </button>
        </div>
      );
    }

    return (
      <div className="ll-students">
        {renderStudentToolbar()}

        <div className="ll-queue ll-students-queue">
          <div className="ll-queue-head ll-head-student" aria-hidden="true">
            <span>Student</span>
            <span>Contact</span>
            <span>Room</span>
            <span>Notes</span>
            <span>Actions</span>
          </div>
          {students.map((student) => (
            <div className="ll-queue-row ll-row-student" key={student.id}>
              <div className="ll-student">
                <span className="ll-student-avatar">{getInitials(student.full_name)}</span>
                <div className="ll-student-info">
                  <strong>{student.full_name}</strong>
                  <div className="ll-student-badges">
                    <span className="ll-student-type">{student.student_type === 'daily' ? 'Daily' : 'Monthly'}</span>
                    {student.visa_expiring && (
                      <span className="ll-student-flag ll-student-flag-warn">
                        <span className="material-symbols-rounded">event_busy</span> Visa expiring
                      </span>
                    )}
                    {student.visa_expired && (
                      <span className="ll-student-flag ll-student-flag-error">
                        <span className="material-symbols-rounded">gavel</span> Visa expired
                      </span>
                    )}
                    {student.contract_expired && (
                      <span className="ll-student-flag ll-student-flag-error">
                        <span className="material-symbols-rounded">do_not_disturb_on</span> Contract ended
                      </span>
                    )}
                    {student.nationality && <span className="ll-student-flag">{student.nationality}</span>}
                  </div>
                </div>
              </div>
              <div className="ll-queue-room ll-student-contact">
                <strong>{student.phone || 'No phone'}</strong>
                <small>{student.email || 'No email'}</small>
              </div>
              <div className="ll-queue-room">
                {student.room_title ? (
                  <strong className="ll-student-room">{student.room_title}</strong>
                ) : vacantRooms.length === 0 ? (
                  <span className="ll-queue-none">No rooms available</span>
                ) : (
                  <div className="ll-student-room-assign">
                    <strong>Unassigned</strong>
                    <div className="ll-student-room-assign-row">
                      <select
                        className="ll-assign-select ll-assign-select-sm"
                        value={studentAssignMap[student.id] || ''}
                        onChange={(e) => setStudentAssignMap((prev) => ({ ...prev, [student.id]: e.target.value }))}
                        aria-label={`Assign ${student.full_name} to a room`}
                      >
                        <option value="">Assign a room…</option>
                        {vacantRooms.map((roomOption) => (
                          <option value={roomOption.id} key={roomOption.id}>{roomOption.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ll-action ll-action-approve"
                        disabled={!studentAssignMap[student.id]}
                        onClick={() => handleStudentAssign(student, studentAssignMap[student.id])}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="ll-queue-room ll-student-notes">
                <span>{student.notes || '—'}</span>
              </div>
              <div className="ll-queue-actions">
                <button type="button" className="ll-action ll-action-reject" onClick={() => openManageBills(student)}>
                  <span className="material-symbols-rounded">receipt_long</span>
                  Manage Bills
                </button>
                {student.room_id ? (
                  <button
                    type="button"
                    className="ll-action ll-action-cancel"
                    onClick={() => requestRemoveStudentFromRoom(student)}
                  >
                    <span className="material-symbols-rounded">meeting_room</span>
                    Remove from Room
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ll-action ll-action-reject"
                  onClick={() => openEditStudent(student)}
                >
                  <span className="material-symbols-rounded">edit</span>
                  Edit
                </button>
                <button
                  type="button"
                  className="ll-action ll-action-cancel"
                  onClick={() => requestDeleteStudent(student)}
                >
                  <span className="material-symbols-rounded">delete</span>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFloors = () => {
    if (floors.length === 0) {
      return (
        <div className="ll-state">
          <span className="ll-state-icon material-symbols-rounded">stairs</span>
          <h3>No floors yet</h3>
          <p>Structure your building into floors, then attach each room to a floor.</p>
          <button className="ll-btn ll-btn-primary" onClick={openAddFloor}>
            <span className="material-symbols-rounded">add</span>
            Add Floor
          </button>
        </div>
      );
    }

    const query = floorSearch.trim().toLowerCase();
    const visible = query ? floors.filter((floor) => floor.label.toLowerCase().includes(query)) : floors;

    const workWithFloor = (floor) => {
      setFloorFilter(floor.id);
      setActiveTab('rooms');
    };

    return (
      <div className="ll-floors">
        <div className="ll-floor-toolbar">
          <div className="ll-floor-search">
            <span className="material-symbols-rounded">search</span>
            <input
              type="search"
              placeholder="Search floors by name…"
              value={floorSearch}
              onChange={(e) => setFloorSearch(e.target.value)}
              aria-label="Search floors by name"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="ll-state">
            <span className="ll-state-icon material-symbols-rounded">search_off</span>
            <h3>No floors match “{floorSearch}”</h3>
            <p>Try a different name, or add a new floor.</p>
            <button className="ll-btn ll-btn-primary" onClick={openAddFloor}>
              <span className="material-symbols-rounded">add</span>
              Add Floor
            </button>
          </div>
        ) : (
          <div className="ll-floor-grid">
            {visible.map((floor) => (
              <div
                key={floor.id}
                className="ll-floor-card"
                role="button"
                tabIndex={0}
                aria-label={`Work with the rooms on ${floor.label}`}
                onClick={() => workWithFloor(floor)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); workWithFloor(floor); } }}
                title={`Work with the rooms on ${floor.label}`}
              >
                <span className="ll-floor-name">
                  <span className="material-symbols-rounded">stairs</span>
                  {floor.label}
                </span>
                <div className="ll-floor-stats">
                  <div className="ll-floor-stat">
                    <strong>{floor.room_count || 0}</strong>
                    <span>Total Rooms</span>
                  </div>
                  <div className="ll-floor-stat">
                    <strong>{floor.occupied_count || 0}</strong>
                    <span>Occupied Rooms</span>
                  </div>
                </div>
                <div className="ll-floor-actions">
                  <button
                    type="button"
                    className="ll-floor-act ll-floor-act-edit"
                    onClick={(e) => { e.stopPropagation(); openEditFloor(floor); }}
                  >
                    <span className="material-symbols-rounded">edit</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ll-floor-act ll-floor-act-delete"
                    onClick={(e) => { e.stopPropagation(); requestDeleteFloor(floor); }}
                  >
                    <span className="material-symbols-rounded">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBills = () => {
    const configured = billingConfig.configured;
    const activeStudent = billStudentId ? students.find((s) => s.id === billStudentId) : null;

    const visible = bills.filter((bill) => {
      if (billStatusFilter === 'issued') return bill.status === 'issued' && !isOverdue(bill);
      if (billStatusFilter === 'overdue') return bill.status === 'issued' && isOverdue(bill);
      if (billStatusFilter === 'paid') return bill.status === 'paid';
      return true;
    });
    visibleBillsRef.current = visible;

    const totals = { expected: 0, collected: 0 };
    visible.forEach((bill) => {
      const view = billStatusView(bill);
      if (view.label === 'Paid') totals.collected += parseFloat(bill.amount) || 0;
      else totals.expected += parseFloat(bill.amount) || 0;
    });

    const renderFilter = () => (
      <div className="ll-bills-toolbar">
        <div className="ll-status-seg" role="group" aria-label="Filter bills by status">
          {[
            { key: 'all', label: 'All' },
            { key: 'issued', label: 'Pending' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'paid', label: 'Paid' },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`ll-seg-btn${billStatusFilter === filter.key ? ' active' : ''}`}
              aria-pressed={billStatusFilter === filter.key}
              onClick={() => setBillStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {activeStudent && (
          <div className="ll-filter-chip" role="status">
            <span className="material-symbols-rounded">receipt_long</span>
            Bills for <strong>{activeStudent.full_name}</strong>
            <button type="button" onClick={() => setBillStudentId(null)}>
              Clear
            </button>
          </div>
        )}
      </div>
    );

    return (
      <div className="ll-bills">
        {!configured && (
          <div className="ll-config-banner">
            <span className="ll-config-banner-icon material-symbols-rounded">tune</span>
            <div>
              <strong>Billing is not set up yet</strong>
              <p>Set your default room fee and utility rates so you can generate itemized monthly bills.</p>
            </div>
            <button type="button" className="ll-btn ll-btn-primary" onClick={() => setConfigModal(true)}>
              <span className="material-symbols-rounded">settings</span>
              Open Billing Config
            </button>
          </div>
        )}

        <div className="ll-bills-summary" aria-label="Expected vs collected">
          <div className="ll-bills-summary-head">
            <strong>Expected vs collected</strong>
            <small>{visible.length} bill{visible.length === 1 ? '' : 's'} shown</small>
          </div>
          <div className="ll-bills-summary-tiles">
            <div className="ll-bills-summary-tile">
              <small className="ll-month-label">Expected</small>
              <strong>{fmtMoney(totals.expected)}</strong>
            </div>
            <div className="ll-bills-summary-tile ll-bills-summary-tile-collected">
              <small className="ll-month-label">Collected</small>
              <strong>{fmtMoney(totals.collected)}</strong>
            </div>
          </div>
        </div>

        {renderFilter()}

        {visible.length === 0 ? (
          <div className="ll-state">
            <span className="ll-state-icon material-symbols-rounded">receipt</span>
            {configured ? (
              <>
                <h3>No bills {billStatusFilter !== 'all' ? 'match this filter' : 'issued yet'}</h3>
                <p>Create a single bill, or generate monthly bills for every assigned student in one go.</p>
                <div className="ll-state-actions">
                  <button className="ll-btn ll-btn-primary" onClick={openIssueBill}>
                    <span className="material-symbols-rounded">receipt_long</span>
                    Issue a Bill
                  </button>
                  <button className="ll-btn ll-btn-secondary" disabled={generateBusy} onClick={handleGenerateBills}>
                    {generateBusy ? <span className="material-symbols-rounded ll-spin">autorenew</span> : <span className="material-symbols-rounded">auto_awesome</span>}
                    Generate Monthly Bills
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>No bills issued</h3>
                <p>Create monthly bills for your students and track expected vs collected income.</p>
                <button className="ll-btn ll-btn-primary" onClick={openIssueBill}>
                  <span className="material-symbols-rounded">receipt_long</span>
                  Issue a Bill
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="ll-queue">
            <div className="ll-queue-head ll-head-bills" aria-hidden="true">
              <span>Bill</span>
              <span>Student</span>
              <span>Room</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {visible.map((bill) => {
              const view = billStatusView(bill);
              return (
                <div className="ll-queue-row ll-row-bills" key={bill.id}>
                  <div className="ll-queue-date ll-bill-period">
                    <span className="material-symbols-rounded">calendar_month</span>
                    <span>
                      <strong>{fmtMonth(bill.period)}</strong>
                      <small>Due {fmtDate(bill.due_date)}</small>
                    </span>
                  </div>
                  <div className="ll-queue-room">
                    <strong>{bill.student_name || 'Not linked'}</strong>
                    {Array.isArray(bill.items) && bill.items.length > 0 && (
                      <small>{bill.items.length} item{bill.items.length === 1 ? '' : 's'}</small>
                    )}
                  </div>
                  <div className="ll-queue-room">
                    <strong>{bill.room_title || 'Not linked'}</strong>
                  </div>
                  <div className="ll-queue-total">
                    <strong>{fmtMoney(bill.amount)}</strong>
                  </div>
                  <span className={`ll-status ${view.cls}`}>{view.label}</span>
                  <div className="ll-queue-actions">
                    <button type="button" className="ll-action ll-action-reject" onClick={() => setViewBill(bill)}>
                      <span className="material-symbols-rounded">visibility</span>
                      View
                    </button>
                    {bill.status === 'issued' && (
                      <>
                        <button
                          type="button"
                          className="ll-action ll-action-approve"
                          onClick={async () => {
                            const who = bill.student_name || bill.room_title || 'this bill';
                            if (!window.confirm(
                              `Mark the bill for ${who} as paid? This records the payment and cannot be undone.`
                            )) return;
                            try {
                              await api.patch(`/api/landlord/bills/${bill.id}/mark-paid`);
                              loadForTab(activeTab);
                              showToast('Bill marked as paid.');
                            } catch (err) {
                              showToast('Could not update the bill. Please try again.');
                            }
                          }}
                        >
                          <span className="material-symbols-rounded">payments</span>
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          className="ll-action ll-action-reject"
                          onClick={async () => {
                            try {
                              await api.patch(`/api/landlord/bills/${bill.id}/resend`);
                              loadForTab(activeTab);
                              showToast('Bill resent.');
                            } catch (err) {
                              showToast('Could not resend the bill. Please try again.');
                            }
                          }}
                        >
                          <span className="material-symbols-rounded">send</span>
                          Resend
                        </button>
                        <button
                          type="button"
                          className="ll-action ll-action-cancel"
                          onClick={() => requestDeleteBill(bill)}
                          aria-label={`Delete ${fmtMonth(bill.period)} bill`}
                        >
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFees = () => {
    const addonActive = addon.enabled;
    const activeRoom = feeRoomId ? rooms.find((r) => r.id === feeRoomId) : null;

    const byCurrency = {};
    fees.forEach((fee) => {
      const cur = fee.currency || 'USD';
      if (!byCurrency[cur]) byCurrency[cur] = { expected: 0, collected: 0 };
      const amount = parseFloat(fee.total) || 0;
      if (fee.display_status === 'paid') byCurrency[cur].collected += amount;
      else byCurrency[cur].expected += amount;
    });
    const currencyEntries = Object.entries(byCurrency);

    const planLabel = addon.plan === 'yearly' ? 'Yearly' : 'Monthly';

    let addonTitle;
    let addonBody;
    if (addonActive) {
      addonTitle = 'Management Fees is active';
      addonBody = `${planLabel} plan, valid until ${fmtDate(addon.expires_at)}.`;
    } else if (addon.status === 'none') {
      addonTitle = 'Management Fees is an add-on';
      addonBody = 'Invoice room owners for maintenance and service charges. Subscribe to start creating invoices.';
    } else {
      addonTitle = `Add-on ${addon.status === 'expired' ? 'expired' : 'cancelled'}`;
      addonBody = addon.status === 'expired'
        ? `Your ${planLabel.toLowerCase()} plan expired on ${fmtDate(addon.expires_at)}. Existing invoices stay readable — renew to keep creating them.`
        : `Your ${planLabel.toLowerCase()} plan ended on ${fmtDate(addon.expires_at)}. Existing invoices stay readable — renew to keep creating them.`;
    }

    const renderRoomFilter = () => {
      return (
        <div className="ll-fee-toolbar">
          {activeRoom && (
            <div className="ll-filter-chip" role="status">
              <span className="material-symbols-rounded">request_quote</span>
              Showing fees for <strong>{activeRoom.title}</strong>
              <button type="button" onClick={() => setFeeRoomId(null)}>
                Clear
              </button>
            </div>
          )}
          <div className="ll-fee-room-filter">
            <span className="material-symbols-rounded">filter_alt</span>
            <select
              value={feeRoomId || ''}
              onChange={(e) => setFeeRoomId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filter fees by room"
            >
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option value={room.id} key={room.id}>{room.title && room.title.length > 36 ? `${room.title.slice(0, 36)}…` : room.title}</option>
              ))}
            </select>
          </div>
        </div>
      );
    };

    return (
      <div className="ll-fees">
        <div className={`ll-addon ${addonActive ? 'll-addon-ok' : 'll-addon-down'}`}>
          <span className="ll-addon-icon material-symbols-rounded">{addonActive ? 'verified_user' : 'workspace_premium'}</span>
          <div className="ll-addon-copy">
            <strong>{addonTitle}</strong>
            <p>{addonBody}</p>
          </div>
          <div className="ll-addon-actions">
            {addonActive ? (
              <button type="button" className="ll-btn ll-btn-secondary" onClick={requestCancelAddon}>
                <span className="material-symbols-rounded">pan_tool_alt</span>
                Cancel subscription
              </button>
            ) : (
              <>
                <button type="button" className="ll-btn ll-btn-primary" disabled={addonBusy} onClick={() => subscribeAddon('monthly')}>
                  <span className="material-symbols-rounded">calendar_month</span>
                  Subscribe Monthly
                </button>
                <button type="button" className="ll-btn ll-btn-primary ll-btn-yearly" disabled={addonBusy} onClick={() => subscribeAddon('yearly')}>
                  <span className="material-symbols-rounded">calendar_today</span>
                  Subscribe Yearly · best rate
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ll-fee-summary" aria-label="Expected vs collected">
          <div className="ll-fee-summary-head">
            <strong>Expected vs collected</strong>
            <small>Across all invoices</small>
          </div>
          <div className="ll-fee-summary-tiles">
            {currencyEntries.length === 0 ? (
              <span className="ll-fee-summary-none">No invoices yet — expected and collected will show up here.</span>
            ) : (
              currencyEntries.map(([cur, totals]) => (
                <div className="ll-fee-summary-pair" key={cur}>
                  <div className="ll-fee-summary-tile">
                    <small className="ll-month-label">Expected ({cur})</small>
                    <strong>{fmtCurrency(totals.expected, cur)}</strong>
                  </div>
                  <div className="ll-fee-summary-tile ll-fee-summary-tile-collected">
                    <small className="ll-month-label">Collected ({cur})</small>
                    <strong>{fmtCurrency(totals.collected, cur)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {renderRoomFilter()}

        {fees.length === 0 ? (
          <div className="ll-state">
            <span className="ll-state-icon material-symbols-rounded">request_quote</span>
            <h3>No management fees yet</h3>
            <p>Create your first invoice to bill a room owner for maintenance and service charges.</p>
            {addonActive && (
              <button className="ll-btn ll-btn-primary" onClick={openCreateFee}>
                <span className="material-symbols-rounded">add</span>
                Create Management Fee
              </button>
            )}
          </div>
        ) : (
          <div className="ll-queue">
            <div className="ll-queue-head ll-head-bills" aria-hidden="true">
              <span>Period</span>
              <span>Owner</span>
              <span>Room</span>
              <span>Total</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {fees.map((fee) => {
              const view = feeView(fee);
              const items = Array.isArray(fee.line_items) ? fee.line_items : [];
              return (
                <div className="ll-queue-row ll-row-bills" key={fee.id}>
                  <div className="ll-queue-date ll-bill-period">
                    <span className="material-symbols-rounded">calendar_month</span>
                    <span>
                      <strong>{fmtDate(fee.period_start)} – {fmtDate(fee.period_end)}</strong>
                      <small>Due {fmtDate(fee.due_date)}</small>
                    </span>
                  </div>
                  <div className="ll-queue-room">
                    <strong>{fee.owner_name || 'Not set'}</strong>
                    {fee.owner_contact && <small>{fee.owner_contact}</small>}
                  </div>
                  <div className="ll-queue-room">
                    <strong>{fee.room_title || 'Not linked'}</strong>
                    {items.length > 0 && <small>{items.length} item{items.length === 1 ? '' : 's'}</small>}
                  </div>
                  <div className="ll-queue-total">
                    <strong>{fmtCurrency(fee.total, fee.currency)}</strong>
                    <small>{fee.currency}</small>
                  </div>
                  <span className={`ll-status ${view.cls}`}>{view.label}</span>
                  <div className="ll-queue-actions">
                    {fee.status !== 'paid' && (
                      <button
                        type="button"
                        className="ll-action ll-action-approve"
                        onClick={async () => {
                          const who = fee.room_title || fee.owner_contact || 'this invoice';
                          if (!window.confirm(
                            `Mark the invoice for ${who} as paid? This records the payment and cannot be undone.`
                          )) return;
                          try {
                            await api.patch(`/api/landlord/management-fees/${fee.id}/mark-paid`);
                            loadForTab(activeTab);
                            showToast('Invoice marked as paid.');
                          } catch (err) {
                            showToast('Could not update the invoice. Please try again.');
                          }
                        }}
                      >
                        <span className="material-symbols-rounded">payments</span>
                        Mark Paid
                      </button>
                    )}
                    {fee.status === 'pending' && (
                      <button
                        type="button"
                        className="ll-action ll-action-cancel"
                        onClick={() => requestDeleteFee(fee)}
                        aria-label={`Delete management fee for ${fee.room_title || 'room'}`}
                      >
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      if (activeTab === 'rooms' || activeTab === 'dashboard') return renderRoomsSkeleton();
      return renderQueueSkeleton();
    }
    if (loadError) return renderErrorState();

    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'rooms': return renderRooms();
      case 'bookings': return renderBookings();
      case 'students': return renderStudents();
      case 'floors': return renderFloors();
      case 'bills': return renderBills();
      case 'fees': return renderFees();
      default: return null;
    }
  };

  const tabCount = (tab) => {
    if (tab === 'rooms') return rooms.length;
    if (tab === 'bookings') return bookings.length;
    if (tab === 'students') return students.length;
    if (tab === 'floors') return floors.length;
    if (tab === 'bills') return bills.length;
    if (tab === 'fees') return fees.length;
    return 0;
  };

  return (
    <>
      <Header activePage="/landlord" />

      <main className="ll-main">
        <section className="ll-hero">
          <picture>
            <source srcSet={`${landlordHero800Webp} 800w, ${landlordHeroWebp} 1920w`} type="image/webp" sizes="100vw" />
            <img
              src={landlordHero}
              alt=""
              className="ll-hero-img"
              loading="eager"
              fetchPriority="high"
              width="1920"
              height="1080"
            />
          </picture>
          <div className="ll-hero-overlay" />
          <div className="ll-hero-content">
            <span className="ll-hero-badge">Landlord Portal</span>
            <h1 className="ll-hero-title">
              Manage Your Building Like <span>a Pro</span>
            </h1>
            <p className="ll-hero-sub">
              Track occupancy, students, bills and income — all in one dashboard.
            </p>
          </div>
        </section>

        <section className="ll-dash container">
          <div className="ll-worktop">
            <h2 className="visually-hidden">{activeTab === 'dashboard' ? 'Dashboard overview' : `${activeTab} section`}</h2>
            <div className="ll-tabs" role="tablist" aria-label="Portal sections">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  id={`tab-${tab.key}`}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls="panel-portal"
                  className={`ll-tab${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="material-symbols-rounded">{tab.icon}</span>
                  {tab.label}
                  {tab.key !== 'dashboard' && <span className="ll-tab-count">{tabCount(tab.key)}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'rooms' && (
              <button className="ll-btn ll-btn-primary" onClick={handleCreate}>
                <span className="material-symbols-rounded">add</span>
                Add Room
              </button>
            )}
            {activeTab === 'students' && (
              <button className="ll-btn ll-btn-primary" onClick={openAddStudent}>
                <span className="material-symbols-rounded">add</span>
                Add Student
              </button>
            )}
            {activeTab === 'floors' && (
              <button className="ll-btn ll-btn-primary" onClick={openAddFloor}>
                <span className="material-symbols-rounded">add</span>
                Add Floor
              </button>
            )}
            {activeTab === 'bills' && (
              <>
                <button
                  type="button"
                  className="ll-btn ll-btn-secondary"
                  disabled={generateBusy}
                  onClick={handleGenerateBills}
                >
                  {generateBusy ? <span className="material-symbols-rounded ll-spin">autorenew</span> : <span className="material-symbols-rounded">auto_awesome</span>}
                  Generate
                </button>
                <button
                  type="button"
                  className="ll-btn ll-btn-secondary"
                  onClick={() => setConfigModal(true)}
                  title="Billing config (room fee, utility rates, billing day)"
                >
                  <span className="material-symbols-rounded">settings</span>
                  Config
                </button>
                <button
                  type="button"
                  className="ll-btn ll-btn-secondary"
                  onClick={exportBillsPDF}
                  title="Export the visible bills as a printable PDF report"
                >
                  <span className="material-symbols-rounded">picture_as_pdf</span>
                  Export
                </button>
                <button className="ll-btn ll-btn-primary" onClick={openIssueBill}>
                  <span className="material-symbols-rounded">add</span>
                  Issue a Bill
                </button>
              </>
            )}
            {activeTab === 'fees' && (
              <button
                className="ll-btn ll-btn-primary"
                onClick={openCreateFee}
                disabled={!addon.enabled}
                title={!addon.enabled ? 'Activate the Management Fees add-on to create invoices' : undefined}
              >
                <span className="material-symbols-rounded">add</span>
                Create Management Fee
              </button>
            )}
          </div>

          <div id="panel-portal" role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
            {renderContent()}
          </div>

          <p className="ll-help">
            Need a hand? Visit <Link to="/about">About us</Link> or reach out via the contact details in your profile.
          </p>
        </section>

        {toast && (
          <div className="ll-toast" role="status">
            <span className="material-symbols-rounded">check_circle</span>
            {toast}
          </div>
        )}
      </main>

      {showModal && (
        <AdminRoomModal
          room={editingRoom}
          onSave={handleRoomSaved}
          onClose={() => { setShowModal(false); setEditingRoom(null); }}
          roomListPath="/api/landlord/rooms"
          floors={floors}
        />
      )}
      {deletingRoom && (
        <AdminDeleteModal
          room={deletingRoom}
          onClose={() => setDeletingRoom(null)}
          onConfirm={confirmDeleteRoom}
        />
      )}
      {floorModal && (
        <AddFloorModal
          floor={editingFloor}
          onSave={handleFloorSaved}
          onClose={() => { setFloorModal(false); setEditingFloor(null); }}
        />
      )}
      {studentModal && (
        <StudentModal
          student={editingStudent}
          rooms={rooms}
          onSave={handleStudentSaved}
          onClose={() => { setStudentModal(false); setEditingStudent(null); }}
        />
      )}
      {assignCreateRoom && (
        <RoomAssignModal
          room={assignCreateRoom}
          onSaved={handleAssignCreateSaved}
          onClose={() => setAssignCreateRoom(null)}
        />
      )}
      {billModal && (
        <BillModal
          students={students}
          config={billingConfig}
          onOpenConfig={() => { setBillModal(false); setConfigModal(true); }}
          onSave={handleBillSaved}
          onClose={() => setBillModal(false)}
        />
      )}
      {feeModal && (
        <ManagementFeesModal
          rooms={rooms}
          initialRoomId={feeRoomId}
          onSave={handleFeeSaved}
          onClose={() => setFeeModal(false)}
        />
      )}
      {viewBill && (
        <BillDetailModal
          bill={viewBill}
          config={billingConfig}
          onUpdated={(message) => { setViewBill(null); loadForTab(activeTab); showToast(message); }}
          onClose={() => setViewBill(null)}
        />
      )}
      {configModal && (
        <BillingConfigModal
          config={billingConfig}
          onSaved={handleConfigSaved}
          onClose={() => setConfigModal(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title={confirmDelete.title}
          kind={confirmDelete.kind}
          message={confirmDelete.message}
          onConfirm={confirmDelete.run}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      <Footer />
    </>
  );
}