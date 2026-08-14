import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

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

export default function AdminRoomModal({ room, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(100);
  const [refId, setRefId] = useState('');
  const [badge, setBadge] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (room) {
      setTitle(room.title || '');
      setDescription(room.description || '');
      setPrice(room.price?.toString() || '');
      setCategory(room.category || '');
      setAddress(room.address || '');
      setImageUrl(room.image_url || '');
      setBeds(room.beds || 1);
      setBaths(room.baths || 1);
      setSqft(room.sqft || 100);
      setRefId(room.ref_id || '');
      setBadge(room.badge || '');
      setMapQuery(room.map_query || '');
      if (room.image_url) {
        setPreviewImage(resolveImage(room.image_url));
      }
    }
  }, [room]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('room-images')
        .getPublicUrl(fileName);

      setPreviewImage(publicUrl);
      setImageUrl(publicUrl);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl && imageUrl.includes('/storage/v1/object/public/')) {
      const path = imageUrl.split('/room-images/')[1];
      if (path) {
        await supabase.storage.from('room-images').remove([path]);
      }
    }
    setPreviewImage('');
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError('Valid price is required');
      return;
    }

    setLoading(true);

    try {
      const roomData = {
        title,
        description,
        price: parseFloat(price),
        category,
        address,
        image_url: imageUrl,
        beds: parseInt(beds, 10),
        baths: parseInt(baths, 10),
        sqft: parseInt(sqft, 10),
        ref_id: refId,
        badge,
        map_query: mapQuery,
      };

      if (room) {
        const { error } = await supabase
          .from('rooms')
          .update({
            ...roomData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', room.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('rooms').insert([{
          ...roomData,
          created_at: new Date().toISOString(),
        }]);

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-room-modal">
        {/* Sticky Header */}
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <h2>{room ? 'Edit Room' : 'Add New Room'}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
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
                <i className="fa-solid fa-align-left" />
                <h3>Basic Information</h3>
              </div>
              
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Title <span className="admin-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter room title"
                    required
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Student Room"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the room, amenities, and key features..."
                  rows={4}
                  className="admin-textarea"
                />
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>
                    Price ($) <span className="admin-required">*</span>
                  </label>
                  <input
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
                  <label>Badge</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g., New, Popular"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Reference ID</label>
                  <input
                    type="text"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    placeholder="e.g., C21_R02113"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>&nbsp;</label>
                  <div className="admin-empty-field" />
                </div>
              </div>
            </section>

            {/* Section 2: Location */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="fa-solid fa-location-dot" />
                <h3>Location</h3>
              </div>

              <div className="admin-form-group">
                <label>Address</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-location-dot" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter room address"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Google Maps Query</label>
                <div className="admin-input-wrapper">
                  <i className="fa-solid fa-map-location-dot" />
                  <input
                    type="text"
                    value={mapQuery}
                    onChange={(e) => setMapQuery(e.target.value)}
                    placeholder="e.g., Boeng%20Keng%20Kang%20Phnom%20Penh"
                    className="admin-input"
                  />
                </div>
                <p className="admin-hint">Used to generate the Google Maps location for this room</p>
              </div>
            </section>

            {/* Section 3: Property Details */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="fa-solid fa-chart-simple" />
                <h3>Property Details</h3>
              </div>

              <div className="admin-form-grid-three-column">
                <div className="admin-form-group">
                  <label>Beds</label>
                  <input
                    type="number"
                    value={beds}
                    onChange={(e) => setBeds(e.target.value)}
                    min="1"
                    max="10"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Baths</label>
                  <input
                    type="number"
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    min="1"
                    max="10"
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Area (sqft)</label>
                  <input
                    type="number"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    min="0"
                    className="admin-input"
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Room Image */}
            <section className="admin-section">
              <div className="admin-section-header">
                <i className="fa-solid fa-image" />
                <h3>Room Image</h3>
              </div>

              <div className="admin-image-upload-area">
                {previewImage ? (
                  <div className="admin-image-preview">
                    <img src={previewImage} alt="Room preview" className="admin-preview-image" />
                    <div className="admin-image-overlay">
                      <button
                        type="button"
                        className="admin-remove-image-btn"
                        onClick={handleRemoveImage}
                        aria-label="Remove image"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`admin-upload-zone${uploading ? ' uploading' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
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
                        <i className="fa-solid fa-spinner fa-spin" />
                        <span>Uploading image...</span>
                      </div>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up" />
                        <div className="admin-upload-text">
                          <span className="admin-upload-label">Upload room image</span>
                          <span className="admin-upload-sublabel">PNG, JPG or WEBP up to 5MB</span>
                          <span className="admin-upload-hint">Click to upload or drag and drop</span>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/png,image/jpeg,image/webp"
                          className="admin-file-input"
                        />
                      </>
                    )}
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
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Creating Room...</span>
                </span>
              ) : uploading ? (
                <span className="admin-btn-loading">
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Uploading...</span>
                </span>
              ) : room ? (
                <span>
                  <i className="fa-solid fa-floppy-disk" />
                  <span>Update Room</span>
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-plus" />
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
