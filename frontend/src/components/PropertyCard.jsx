import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImage } from '../lib/images.js';

export default function PropertyCard({ image, badge, link, title, address, price, metas, alt, distanceLabel }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <div className="card">
      <div className="card-banner">
        <figure className="img-holder" style={{ '--width': 585, '--height': 390 }}>
          <img src={resolveImage(image)} width="585" height="390" alt={alt} className="img-cover" loading="lazy" />
        </figure>

        {badge && <span className="badge label-medium">{badge}</span>}

        <button
          className={`icon-btn fav-btn${favorite ? ' active' : ''}`}
          aria-label={favorite ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={favorite}
          data-toggle-btn
          onClick={() => setFavorite((prev) => !prev)}
        >
          <span className="material-symbols-rounded" aria-hidden="true">favorite</span>
        </button>
      </div>

      <div className="card-content">
        <span className="title-large">{price}</span>

        <h3>
          <Link to={link} className="title-small card-title main-card-link">{title}</Link>
        </h3>

        <address className="body-medium card-text">{address}</address>

        {distanceLabel && (
          <span className="property-distance-label label-medium" title={address}>
            <span className="material-symbols-rounded" aria-hidden="true">near_me</span>
            {distanceLabel}
          </span>
        )}

        <div className="card-meta-list">
          {metas[0] && (
            <div className="meta-item">
              <span className="material-symbols-rounded meta-icon" aria-hidden="true">bed</span>
              <span className="meta-text label-medium">{metas[0]}</span>
            </div>
          )}
          {metas[1] && (
            <div className="meta-item">
              <span className="material-symbols-rounded meta-icon" aria-hidden="true">bathtub</span>
              <span className="meta-text label-medium">{metas[1]}</span>
            </div>
          )}
          {metas[2] && (
            <div className="meta-item">
              <span className="material-symbols-rounded meta-icon" aria-hidden="true">straighten</span>
              <span className="meta-text label-medium">{metas[2]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
