import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { resolveImage } from '../../lib/images';
import useDialog from '../../hooks/useDialog';

function isHttpUrl(value) {
  return /^https?:\/\//i.test((value || '').trim());
}

const MAX_ROOM_IMAGES = 6;

const AMENITY_OPTIONS = [
  'Air Conditioner',
  'WiFi',
  'Parking',
  'Kitchen',
  'Balcony',
  '24/7 Security',
  'Fully Furnished',
  'Water Supply',
  'Elevator',
  'Pet Friendly',
  'Gym',
  'Laundry',
];

export default function AdminRoomModal({ room, onSave, onClose, roomListPath = '/api/rooms', onSaveError, floors = [] }) {
  const modalRef = useRef(null);
  useDialog({ open: true, onClose, dialogRef: modalRef });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [floorId, setFloorId] = useState('');
  const [address, setAddress] = useState('');
  const [images, setImages] = useState([]);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(1200);
  const [badge, setBadge] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [mapLinkUrl, setMapLinkUrl] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerTelegram, setOwnerTelegram] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [contractTerms, setContractTerms] = useState('');
  const [depositTerms, setDepositTerms] = useState('');
  const [petPolicy, setPetPolicy] = useState('');
  const [utilitiesTerms, setUtilitiesTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [mapLinkError, setMapLinkError] = useState('');
  const [mapLinkSuccess, setMapLinkSuccess] = useState('');
  const fileInputRef = useRef(null);
  const parseInFlightRef = useRef(null);

  useEffect(() => {
    if (room) {
      setTitle(room.title || '');
      setDescription(room.description || '');
      setPrice(room.price?.toString() || '');
      setFloorId(room.floor_id ?? '');
      setAddress(room.address || '');
      setImages([
        room.image_url,
        ...(Array.isArray(room.thumb_images) ? room.thumb_images : []),
      ].filter(Boolean));
      setBeds(room.beds || 1);
      setBaths(room.baths || 1);
      setSqft(room.sqft || 1200);
      setBadge(room.badge || '');
      setMapQuery(room.map_query || '');
      setMapLinkUrl(isHttpUrl(room.map_query) ? room.map_query : '');
      setLatitude(room.latitude ?? '');
      setLongitude(room.longitude ?? '');
      setOwnerName(room.owner_name || '');
      setOwnerPhone(room.owner_phone || '');
      setOwnerEmail(room.owner_email || '');
      setOwnerTelegram(room.owner_telegram || '');
      setAmenities(room.amenities || []);
      setContractTerms(room.contract_terms || '');
      setDepositTerms(room.deposit_terms || '');
      setPetPolicy(room.pet_policy || '');
      setUtilitiesTerms(room.utilities_terms || '');
    }
  }, [room]);

  const toggleAmenity = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const parseMapLink = async (url) => {
    // Reuse an in-flight parse for the same URL so a blur + save that happen
    // back-to-back (paste link, click Save) only hit the API once.
    const existing = parseInFlightRef.current;
    if (existing && existing.url === url) return existing.promise;

    const promise = api.post('/api/landlord/parse-map-link', { url })
      .then((res) => ({
        latitude: String(res.latitude),
        longitude: String(res.longitude),
        url: typeof res.url === 'string' ? res.url : '',
      }))
      .finally(() => {
        if (parseInFlightRef.current?.url === url) parseInFlightRef.current = null;
      });
    parseInFlightRef.current = { url, promise };
    return promise;
  };

  const handleMapLinkBlur = async (e) => {
    const url = e.target.value.trim();
    if (!url) return;
    setMapLinkError('');
    setMapLinkSuccess('');
    try {
      const { latitude: lat, longitude: lng, url: resolvedUrl } = await parseMapLink(url);
      setLatitude(lat);
      setLongitude(lng);
      if (resolvedUrl) setMapLinkUrl(resolvedUrl);
      setMapLink('');
      setMapLinkSuccess('Location saved from this link.');
    } catch (err) {
      setMapLinkError(err.message || 'Could not parse this link.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= MAX_ROOM_IMAGES) {
      setError(`You can add up to ${MAX_ROOM_IMAGES} images.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be under 5MB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Please upload PNG, JPG or WEBP images only');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Backend stores the file and returns { url: "/uploads/<name>" }
      const res = await api.postForm('/api/uploads', formData);

      setImages((prev) => [...prev, res.url]);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index) => {
    const url = images[index];
    if (url && url.startsWith('/uploads/')) {
      const filename = url.split('/uploads/')[1];
      if (filename) {
        try {
          await api.del(`/api/uploads/${encodeURIComponent(filename)}`);
        } catch (err) {
          console.error('Failed to delete uploaded file:', err);
        }
      }
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMoveImage = (from, to) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const numericPrice = parseFloat(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Valid price is required');
      return;
    }

    const bedsNum = Math.max(1, Math.min(10, parseInt(beds, 10) || 1));
    const bathsNum = Math.max(1, Math.min(10, parseInt(baths, 10) || 1));
    const sqftNum = Math.max(0, parseInt(sqft, 10) || 0);

    // If the link field still has a value (user pasted and clicked Save
    // without clicking away first), parse it now so the location is captured.
    let latNum = parseFloat(latitude);
    let lngNum = parseFloat(longitude);

    if (mapLink.trim()) {
      setLoading(true);
      try {
        const { latitude: lat, longitude: lng, url: resolvedUrl } = await parseMapLink(mapLink.trim());
        latNum = parseFloat(lat);
        lngNum = parseFloat(lng);
        setLatitude(lat);
        setLongitude(lng);
        if (resolvedUrl) setMapLinkUrl(resolvedUrl);
        setMapLink('');
      } catch (err) {
        setError(err.message || 'Could not parse this Google Maps link. Please check the URL and try again.');
        setLoading(false);
        return;
      }
    }

    const computedMapQuery = mapLinkUrl.trim()
      ? mapLinkUrl.trim()
      : ((Number.isFinite(latNum) && Number.isFinite(lngNum))
          ? `${latNum},${lngNum}`
          : (mapQuery || null));

    setLoading(true);

    try {
      const roomData = {
        title,
        description,
        price: numericPrice,
        address,
        image_url: images[0] || '',
        thumb_images: images.slice(1).length > 0 ? images.slice(1) : null,
        beds: bedsNum,
        baths: bathsNum,
        sqft: sqftNum,
        badge,
        map_query: computedMapQuery,
        latitude: Number.isFinite(latNum) ? latNum : null,
        longitude: Number.isFinite(lngNum) ? lngNum : null,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
        owner_telegram: ownerTelegram,
        amenities,
        contract_terms: contractTerms,
        deposit_terms: depositTerms,
        pet_policy: petPolicy,
        utilities_terms: utilitiesTerms,
      };

      if (floors.length > 0) {
        roomData.floor_id = floorId === '' ? null : Number(floorId);
      }

      if (room) {
        await api.put(`${roomListPath}/${room.id}`, roomData);
      } else {
        await api.post(roomListPath, roomData);
      }

      onSave();
    } catch (err) {
      onSaveError?.(err);
      setError(err.message || 'Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal" role="dialog" aria-modal="true" aria-labelledby="admin-room-modal-title" ref={modalRef}>
        {/* Sticky Header */}
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2 id="admin-room-modal-title">{room ? 'Edit Room' : 'Add New Room'}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="material-symbols-rounded" aria-hidden="true" >close</i>
          </button>
        </div>

        {/* Error Message */}
        {error && <div className="admin-error">{error}</div>}

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="admin-room-form">
          <div className="admin-form-content">
            
            {/* Section 1: Basic Information */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >format_align_left</i>
                <h3>Basic Information</h3>
              </div>
              
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-title">
                    Title <span className="admin-required">*</span>
                  </label>
                  <input
                    id="admin-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter room title"
                    required
                    className="admin-input"
                  />
                </div>
              </div>

              {floors.length > 0 && (
                <div className="admin-form-group">
                  <label htmlFor="admin-floor">
                    Floor <span className="admin-required">*</span>
                  </label>
                  <select
                    id="admin-floor"
                    value={floorId}
                    onChange={(e) => setFloorId(e.target.value)}
                    className="admin-input"
                    required
                  >
                    <option value="">Select the floor this room sits on…</option>
                    {floors.map((floor) => (
                      <option value={floor.id} key={floor.id}>{floor.label}</option>
                    ))}
                  </select>
                  <p className="admin-hint">Every room belongs to a floor. Manage floors from the Floors tab.</p>
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="admin-description">Description</label>
                <textarea
                  id="admin-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the room, amenities, and key features..."
                  rows={4}
                  className="admin-textarea"
                />
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-price">
                    Price ($) <span className="admin-required">*</span>
                  </label>
                  <input
                    id="admin-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-badge">Badge</label>
                  <input
                    id="admin-badge"
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g., New, Popular"
                    className="admin-input"
                  />
                </div>
              </div>

            </section>

            {/* Section 2: Location */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >location_on</i>
                <h3>Location</h3>
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-address">Address</label>
                <div className="admin-input-wrapper">
                  <i className="material-symbols-rounded" aria-hidden="true" >location_on</i>
                  <input
                    id="admin-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter room address"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="admin-map-link">Google Maps Link</label>
                <div className="admin-input-wrapper">
                  <i className="material-symbols-rounded" aria-hidden="true" >location_searching</i>
                  <input
                    id="admin-map-link"
                    type="url"
                    value={mapLink}
                    onChange={(e) => {
                      setMapLink(e.target.value);
                      setMapLinkError('');
                      setMapLinkSuccess('');
                    }}
                    placeholder="Paste a Google Maps link, e.g. https://maps.app.goo.gl/..."
                    className="admin-input"
                    onBlur={handleMapLinkBlur}
                  />
                </div>
                <p className="admin-hint">Paste any Google Maps link and click away to save the room location. The link is stored so students can open the exact place in Google Maps.</p>
                {mapLinkError && <p className="admin-error">{mapLinkError}</p>}
                {mapLinkSuccess && <p className="admin-success">{mapLinkSuccess}</p>}
              </div>
            </section>

            {/* Section 3: Property Details */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >monitoring</i>
                <h3>Property Details</h3>
              </div>

              <div className="admin-form-grid-three-column">
                <div className="admin-form-group">
                  <label htmlFor="admin-beds">Beds</label>
                  <input
                    id="admin-beds"
                    type="number"
                    value={beds}
                    onChange={(e) => setBeds(e.target.value)}
                    min="1"
                    max="10"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-baths">Baths</label>
                  <input
                    id="admin-baths"
                    type="number"
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    min="1"
                    max="10"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-area">Area (sqft)</label>
                  <input
                    id="admin-area"
                    type="number"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    min="0"
                    className="admin-input"
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Amenities */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >star</i>
                <h3>Amenities</h3>
              </div>

              <div className="admin-amenities-grid">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label className={`admin-amenity-item${amenities.includes(amenity) ? ' selected' : ''}`} key={amenity}>
                    <input
                      type="checkbox"
                      checked={amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    <span className="admin-amenity-check"><i className="material-symbols-rounded" aria-hidden="true" >check</i></span>
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Section 5: Owner Information */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >badge</i>
                <h3>Room Owner Information</h3>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-owner-name">Owner Name</label>
                  <input
                    id="admin-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., Mr. Sok Chea"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-owner-phone">Owner Phone</label>
                  <div className="admin-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true" >call</i>
                    <input
                      id="admin-owner-phone"
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g., +855 12 345 678"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-owner-email">Owner Email</label>
                  <div className="admin-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true" >mail</i>
                    <input
                      id="admin-owner-email"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="e.g., owner@example.com"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-owner-telegram">Owner Telegram</label>
                  <div className="admin-input-wrapper">
                    <i className="material-symbols-rounded" aria-hidden="true" >send</i>
                    <input
                      id="admin-owner-telegram"
                      type="text"
                      value={ownerTelegram}
                      onChange={(e) => setOwnerTelegram(e.target.value)}
                      placeholder="e.g., https://t.me/username"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Rental Conditions */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >description</i>
                <h3>Rental Conditions</h3>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-contract">Contract</label>
                  <input
                    id="admin-contract"
                    type="text"
                    value={contractTerms}
                    onChange={(e) => setContractTerms(e.target.value)}
                    placeholder="e.g., 1 Year"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-deposit">Deposit</label>
                  <input
                    id="admin-deposit"
                    type="text"
                    value={depositTerms}
                    onChange={(e) => setDepositTerms(e.target.value)}
                    placeholder="e.g., 2 Months"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="admin-pet-policy">Pet Policy</label>
                  <input
                    id="admin-pet-policy"
                    type="text"
                    value={petPolicy}
                    onChange={(e) => setPetPolicy(e.target.value)}
                    placeholder="e.g., No Pets Allowed"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-utilities">Utilities</label>
                  <input
                    id="admin-utilities"
                    type="text"
                    value={utilitiesTerms}
                    onChange={(e) => setUtilitiesTerms(e.target.value)}
                    placeholder="e.g., Electricity Paid Separately"
                    className="admin-input"
                  />
                </div>
              </div>
            </section>

            {/* Section 7: Room Images */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="material-symbols-rounded" aria-hidden="true" >image</i>
                <h3>Room Images</h3>
              </div>

              <p className="admin-upload-hint">The first photo is the cover shown on listings. You can add up to {MAX_ROOM_IMAGES} images.</p>

              <div className="admin-images-grid">
                {images.map((url, index) => (
                  <div className={`admin-image-tile${index === 0 ? ' is-cover' : ''}`} key={`${url}-${index}`}>
                    <img src={resolveImage(url)} alt={`Room photo ${index + 1}`} />
                    {index === 0 && (
                      <span className="admin-image-cover-badge">
                        <i className="material-symbols-rounded" aria-hidden="true" >workspace_premium</i>
                        Cover
                      </span>
                    )}
                    <div className="admin-image-tile-actions">
                      {index > 0 && (
                        <button
                          type="button"
                          className="admin-image-tile-btn"
                          onClick={() => handleMoveImage(index, index - 1)}
                          aria-label="Move photo left"
                          title="Move left"
                        >
                          <i className="material-symbols-rounded" aria-hidden="true" >chevron_left</i>
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          className="admin-image-tile-btn"
                          onClick={() => handleMoveImage(index, index + 1)}
                          aria-label="Move photo right"
                          title="Move right"
                        >
                          <i className="material-symbols-rounded" aria-hidden="true" >chevron_right</i>
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-image-tile-btn admin-image-tile-btn-danger"
                        onClick={() => handleRemoveImage(index)}
                        aria-label="Remove photo"
                        title="Remove"
                      >
                        <i className="material-symbols-rounded" aria-hidden="true" >delete</i>
                      </button>
                    </div>
                  </div>
                ))}

                {images.length < MAX_ROOM_IMAGES && (
                  <div
                    className={`admin-add-image-tile${uploading ? ' uploading' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload room image (PNG, JPG or WEBP up to 5MB)"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('dragging'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('dragging');
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleImageUpload({ target: { files: [file] } });
                      }
                    }}
                  >
                    {uploading ? (
                      <div className="admin-upload-loading">
                        <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <i className="material-symbols-rounded" aria-hidden="true" >add</i>
                        <span className="admin-add-image-text">
                          {images.length === 0 ? 'Add room photos' : 'Add more'}
                        </span>
                        {images.length > 0 && (
                          <span className="admin-upload-sublabel">
                            {images.length}/{MAX_ROOM_IMAGES}
                          </span>
                        )}
                      </>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/png,image/jpeg,image/webp"
                      className="admin-file-input"
                    />
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Sticky Footer */}
          <div className="admin-modal-footer">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              disabled={loading || uploading}
            >
              {loading ? (
                <span className="admin-btn-loading">
                  <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                  <span>Creating Room...</span>
                </span>
              ) : uploading ? (
                <span className="admin-btn-loading">
                  <i className="material-symbols-rounded spinning" aria-hidden="true" >progress_activity</i>
                  <span>Uploading...</span>
                </span>
              ) : room ? (
                <span>
                  <i className="material-symbols-rounded" aria-hidden="true" >save</i>
                  <span>Update Room</span>
                </span>
              ) : (
                <span>
                  <i className="material-symbols-rounded" aria-hidden="true" >add</i>
                  <span>Create Room</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
