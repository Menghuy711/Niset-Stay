import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import newsCssUrl from '../assets/css/news.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import newsData from '../data/newsData.js';
import newsHero from '../assets/images/news-hero.webp';

const CATEGORY_SLUG = (cat) => String(cat || '').toLowerCase().replace(/\s+/g, '-');

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Scholarships', value: 'scholarship' },
  { label: 'News', value: 'news' },
  { label: 'Activities', value: 'activity' },
  { label: 'Trainings', value: 'training' },
  { label: 'Exchange Programs', value: 'exchange-program' },
  { label: 'Announcements', value: 'announcement' },
];

export default function News() {
  const cssReady = usePageStylesheet(newsCssUrl);

  const [searchParams, setSearchParams] = useSearchParams();
  // Category lives in the URL (?cat=...) so category/tag links from the detail
  // page and deep links both filter correctly, with back/forward working too.
  const requested = searchParams.get('cat') || 'all';
  const [activeFilter, setActiveFilter] = useState(
    FILTERS.some((f) => f.value === requested) ? requested : 'all'
  );

  // Keep the tab in sync when the URL changes without a remount (back/forward,
  // deep links while the page is already mounted). Mirrors FilterSidebar.
  useEffect(() => {
    const current = searchParams.get('cat') || 'all';
    setActiveFilter(
      FILTERS.some((f) => f.value === current) ? current : 'all'
    );
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      activeFilter === 'all'
        ? newsData
        : newsData.filter((item) => CATEGORY_SLUG(item.category) === activeFilter),
    [activeFilter]
  );

  const counts = useMemo(() => {
    const map = { all: newsData.length };
    for (const item of newsData) {
      const slug = CATEGORY_SLUG(item.category);
      map[slug] = (map[slug] || 0) + 1;
    }
    return map;
  }, []);

  if (!cssReady) return <PageLoader />;

  return (
    <>
      <Header activePage="/news" />

      <main>
        <article>
          <section
            className="news-hero"
            aria-label="News and Events banner"
            style={{ backgroundImage: `url(${newsHero})` }}
          >
            <div className="news-hero-overlay" />
            <div className="news-hero-content">
              <span className="news-hero-badge">News & Events</span>
              <h1 className="news-hero-title">What's New at <span>Niset Stay</span></h1>
              <p className="news-hero-sub">Stay updated with the latest happenings, scholarships, and announcements</p>
            </div>
          </section>

          <section className="section news-section" aria-labelledby="news-section-label">
            <div className="container">
              <div className="news-filters" role="tablist" aria-label="Filter news by category">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === f.value}
                    className={`news-filter-btn ${activeFilter === f.value ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(f.value);
                      // Keep the URL in sync so the filter is shareable and
                      // survives refresh/back-navigation. 'all' drops the param.
                      const next = new URLSearchParams(searchParams);
                      if (f.value === 'all') next.delete('cat');
                      else next.set('cat', f.value);
                      setSearchParams(next, { replace: true });
                    }}
                  >
                    <span className="news-filter-label">{f.label}</span>
                    <span className="news-filter-count">({counts[f.value] ?? 0})</span>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="news-empty">
                  <span className="material-symbols-rounded" aria-hidden="true">search_off</span>
                  <p>No articles found in this category yet.</p>
                </div>
              ) : (
                <div className="news-grid">
                  {filtered.map((item) => (
                    <article className="news-card" key={item.id}>
                      <Link to={`/news/${item.id}`} className="news-card-image-link">
                        <div className="news-card-image">
                          <img 
                            src={item.image} 
                            width="400" 
                            height="260" 
                            loading="lazy" 
                            alt={item.title} 
                            className="img-cover" 
                          />
                          <span className={`news-category category-${CATEGORY_SLUG(item.category)}`}>
                            {item.category}
                          </span>
                          {item.badge && (
                            <span className="news-badge">{item.badge}</span>
                          )}
                        </div>
                      </Link>
                      <div className="news-card-content">
                        <div className="news-meta">
                          <span className="material-symbols-rounded" aria-hidden="true">calendar_today</span>
                          <time className="label-medium" dateTime={item.date}>{item.date}</time>
                        </div>
                        <h2>
                          <Link to={`/news/${item.id}`} className="title-medium news-title">{item.title}</Link>
                        </h2>
                        <p className="body-medium news-excerpt">{item.excerpt}</p>
                        <Link to={`/news/${item.id}`} className="news-read-more">
                          <span className="label-medium">Read More</span>
                          <span className="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
