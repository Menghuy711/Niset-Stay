import { useState } from 'react';
import { Link } from 'react-router-dom';

// Eagerly import every property-*.jpg so we can look them up by filename.
const propertyImages = import.meta.glob('../assets/images/property-*.jpg', {
  eager: true,
  import: 'default',
});

function resolveImage(filename) {
  const match = Object.entries(propertyImages).find(([path]) => path.endsWith(`/${filename}`));
  return match ? match[1] : '';
}

export default function PropertyCard({ image, badge, link, title, address, price, metas, alt }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <div className="card">
      <div className="card-banner">
        <figure className="img-holder" style={{ '--width': 585, '--height': 390 }}>
          <img src={resolveImage(image)} width="585" height="390" alt={alt} className="img-cover" />
        </figure>

        {badge && <span className="badge label-medium">{badge}</span>}

        <button
          className={`icon-btn fav-btn${favorite ? ' active' : ''}`}
          aria-label="add to favorite"
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
