import featureBanner1 from '../assets/images/feature-banner-1.jpg';
import featureBanner2 from '../assets/images/feature-banner-2.jpg';

const COPY = {
  home: {
    h1: 'Verified Rooms Near Your Campus',
    p1: 'Skip the hunt. Niset Stay curates safe, affordable student housing across Phnom Penh — every listing verified and every landlord vetted, so you can sign with confidence.',
    list1: ['Verified Listings', 'Close to Campus', 'All-Inclusive Pricing', 'Round-the-Clock Support'],
    h2: 'Flexible Stays That Fit Student Life',
    p2: 'Month-by-month leases, instant booking, and transparent fees. Move in when the semester starts and leave on your terms — no lock-in, no surprises.',
    list2: ['Flexible Lease Terms', 'Instant Booking', 'Transparent Fees', 'Easy Payments'],
    alt1: 'Verified student housing near campus',
    alt2: 'Flexible student-friendly monthly leases',
  },
  rent: {
    h1: 'Filter Rooms Your Way',
    p1: 'Refine by budget, location, beds, and baths to find the room that fits your life. Every listing shows real photos and honest details — nothing to decode.',
    list1: ['Price & Location Filters', 'Real Photos', 'Honest Amenities', 'Compare Rooms Side by Side'],
    h2: 'Book in Minutes',
    p2: 'Found the one? Reserve instantly online and get a confirmation as soon as a landlord approves — no phone tag, no paperwork stacks.',
    list2: ['Instant Confirmations', 'Paperless Booking', 'Secure Payments', 'Status Alerts'],
    alt1: 'Filter student rooms by budget and location',
    alt2: 'Book a verified student room in minutes',
  },
};

export default function FeatureSection({ variant = 'home' }) {
  const copy = COPY[variant] || COPY.home;
  return (
    <>
      <section className="section feature" aria-labelledby="feature-label">
        <div className="container">
          <figure className="feature-banner">
            <img src={featureBanner1} width="1020" height="690" loading="lazy" alt={copy.alt1} className="img-cover" />
          </figure>

          <div className="feature-content">
            <h2 className="headline-medium" id="feature-label">
              {copy.h1}
            </h2>

            <p className="body-large feature-text">{copy.p1}</p>

            <ul className="feature-list">
              {copy.list1.map((item) => (
                <li className="feature-item" key={item}>
                  <span className="material-symbols-rounded feature-icon" aria-hidden="true">check_circle</span>
                  <span className="body-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section feature feature-2" aria-labelledby="feature-label-2">
        <div className="container">
          <figure className="feature-banner">
            <img src={featureBanner2} width="1020" height="690" loading="lazy" alt={copy.alt2} className="img-cover" />
          </figure>

          <div className="feature-content">
            <h2 className="headline-medium" id="feature-label-2">
              {copy.h2}
            </h2>

            <p className="body-large feature-text">{copy.p2}</p>

            <ul className="feature-list">
              {copy.list2.map((item) => (
                <li className="feature-item" key={item}>
                  <span className="material-symbols-rounded feature-icon" aria-hidden="true">check_circle</span>
                  <span className="body-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}