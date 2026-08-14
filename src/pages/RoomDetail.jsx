import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import roomDetailCssUrl from '../assets/css/room-detail.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import RoomDetailTemplate from '../components/RoomDetailTemplate.jsx';
import roomDetails from '../data/roomDetails.js';
import { supabase } from '../lib/supabaseClient.js';

export default function RoomDetail() {
  usePageStylesheet(roomDetailCssUrl);
  const { id } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      setLoading(true);
      setError(null);

      // Check if ID is a legacy numeric ID (backwards compatibility)
      if (id && /^\d+$/.test(id)) {
        const staticRoom = roomDetails[id];
        if (staticRoom) {
          setRoomData(staticRoom);
          setLoading(false);
          return;
        }
      }

      // Fetch from Supabase by UUID
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        setError('Room not found');
        setLoading(false);
        return;
      }

      // Map database fields to template format
      const mappedData = {
        breadcrumbCurrent: data.title,
        title: data.title.toUpperCase(),
        date: new Date(data.created_at).toISOString().split('T')[0],
        refId: data.ref_id || 'N/A',
        location: data.address || 'Location TBA',
        price: `$${data.price}`,
        descriptionTitle: data.title,
        description: data.description || '',
        descriptionPrice: `$${data.price}/month`,
        stats: [
          { value: data.beds || '1', label: data.beds === 1 ? 'Bed' : 'Beds' },
          { value: data.baths || '1', label: data.baths === 1 ? 'Bath' : 'Baths' },
          { value: '0', label: 'Garages' },
          { value: data.sqft || '120', label: 'm²' },
        ],
        mainImage: data.image_url || 'property-1.jpg',
        thumbImages: data.thumb_images && data.thumb_images.length > 0 
          ? data.thumb_images 
          : ['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        mapQuery: data.map_query || 'Phnom%20Penh',
        amenities: data.amenities || [],
        ownerName: data.owner_name || 'Room Owner',
        ownerPhone: data.owner_phone || '',
        ownerEmail: data.owner_email || '',
        ownerTelegram: data.owner_telegram || '',
        contractTerms: data.contract_terms || '',
        depositTerms: data.deposit_terms || '',
        petPolicy: data.pet_policy || '',
        utilitiesTerms: data.utilities_terms || '',
      };

      setRoomData(mappedData);
      setLoading(false);
    };

    fetchRoomData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.8rem',
        color: '#666'
      }}>
        Loading room details...
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.8rem',
        color: '#666',
        gap: '20px'
      }}>
        <p>{error || 'Room not found'}</p>
        <button 
          onClick={() => navigate('/rent')}
          style={{
            padding: '12px 24px',
            fontSize: '1.6rem',
            background: '#2179ff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Rent Page
        </button>
      </div>
    );
  }

  return <RoomDetailTemplate data={roomData} />;
}
