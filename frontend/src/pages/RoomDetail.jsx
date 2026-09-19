import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import roomDetailCssUrl from '../assets/css/room-detail.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import RoomDetailTemplate from '../components/RoomDetailTemplate.jsx';
import { api, imageUrl } from '../lib/api.js';

function formatDate(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '—';
  // Render in local time (not UTC) so records created before midnight UTC but
  // after midnight local don't show the wrong calendar day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RoomDetail() {
  const cssReady = usePageStylesheet(roomDetailCssUrl);
  if (!cssReady) return <PageLoader />;
  const { id } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchRoomData = async () => {
      setLoading(true);
      setError(null);

      // Fetch from API by ID
      let data;
      try {
        data = await api.get(`/api/rooms/${id}`);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Room not found');
          setLoading(false);
        }
        return;
      }
      // Guard against a slow response for a previously-visited room arriving
      // after this effect re-ran (back/forward navigation between rooms).
      if (cancelled) return;
      if (!data) {
        setError('Room not found');
        setLoading(false);
        return;
      }

      // Map database fields to template format
      const numericPrice = parseFloat(data.price);
      const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
      const priceLabel = hasPrice ? `$${numericPrice}` : 'Price on request';
      const sqft = Number.isFinite(Number(data.sqft)) ? Number(data.sqft) : 1200;
      const areaM2 = Math.round(sqft * 0.092903);
      const mappedData = {
        breadcrumbCurrent: data.title,
        title: (data.title || 'Student Room').toUpperCase(),
        date: formatDate(data.created_at),
        refId: data.ref_id || 'N/A',
        location: data.address || 'Location TBA',
        price: priceLabel,
        badge: data.badge || '',
        descriptionTitle: data.title || 'Student Room',
        description: data.description || '',
        descriptionPrice: hasPrice ? `$${numericPrice}/month` : 'Price on request',
        id: data.id,
        stats: [
          { value: data.beds || '1', label: data.beds === 1 ? 'Bed' : 'Beds' },
          { value: data.baths || '1', label: data.baths === 1 ? 'Bath' : 'Baths' },
          { value: sqft, label: 'sqft' },
          { value: areaM2, label: 'm²' },
        ],
        mainImage: imageUrl(data.image_url) || 'property-1.jpg',
        thumbImages: data.thumb_images && data.thumb_images.length > 0
          ? data.thumb_images.map(imageUrl)
          : ['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        mapQuery: data.map_query
          || (data.latitude != null && data.longitude != null
            ? `${data.latitude},${data.longitude}`
            : 'Phnom Penh'),
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        ownerName: data.owner_name || 'Room Owner',
        ownerPhone: data.owner_phone || '',
        ownerEmail: data.owner_email || '',
        ownerTelegram: data.owner_telegram || '',
        contractTerms: data.contract_terms || '',
        depositTerms: data.deposit_terms || '',
        petPolicy: data.pet_policy || '',
        utilitiesTerms: data.utilities_terms || '',
      };

      if (!cancelled) setRoomData(mappedData);
      if (!cancelled) setLoading(false);
    };

    fetchRoomData();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (loading) {
    return (
      <>
        <Header activePage="/rent" />
        <div className="rd-status">
          <span className="material-symbols-rounded" aria-hidden="true">hourglass_empty</span>
          <p>Loading room details...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !roomData) {
    return (
      <>
        <Header activePage="/rent" />
        <div className="rd-status">
          <span className="material-symbols-rounded" aria-hidden="true">search_off</span>
          <p>{error || 'Room not found'}</p>
          <div className="rd-status-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try Again
            </button>
            <button
              type="button"
              className="btn btn-fill"
              onClick={() => navigate('/rent')}
            >
              Back to Rent Page
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return <RoomDetailTemplate data={roomData} />;
}
