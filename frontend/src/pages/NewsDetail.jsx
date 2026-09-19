import { useState, useEffect } from 'react';
import newsDetailCssUrl from '../assets/css/news-detail.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Link, useParams } from 'react-router-dom';
import newsData from '../data/newsData.js';
import BrandIcon from '../components/BrandIcon.jsx';

const SOCIALS = [
  { key: 'fb', label: 'Facebook', brand: 'facebook' },
  { key: 'tw', label: 'Twitter', brand: 'twitter' },
  { key: 'te', label: 'Telegram', brand: 'telegram' },
  { key: 'wa', label: 'WhatsApp', brand: 'whatsapp' },
];

const CATEGORIES = ['Scholarship', 'News', 'Activity', 'Training', 'Exchange Program', 'Announcement'];

function shareLink(key, title, url) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (key) {
    case 'fb': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'tw': return `https://twitter.com/intent/tweet?url=${u}`;
    case 'te': return `https://t.me/share/url?url=${u}`;
    case 'wa': return `https://wa.me/?text=${t}%20${u}`;
    default: return '#';
  }
}

export default function NewsDetail() {
  usePageStylesheet(newsDetailCssUrl);

  const { id } = useParams();
  const article = newsData.find((n) => String(n.id) === id) ?? null;
  const related = article ? newsData.filter((n) => n.id !== article.id).slice(0, 3) : [];

  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!article) return;
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const authorName = article?.author || 'Niset Stay Team';
  const initials = authorName
    .split(' ')
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NS';

  if (!article) {
    return (
      <>
        <Header activePage="/news" />
        <main className="news-detail-page">
          <div className="nd-container">
            <div className="nd-status">
              <span className="material-symbols-rounded" aria-hidden="true">search_off</span>
              <p>Story not found.</p>
              <Link to="/news" className="nd-back-btn">
                <i className="material-symbols-rounded" aria-hidden="true" >arrow_back</i>
                <span>Back to all news &amp; events</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const handleCopyLink = (e) => {
    e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <>
      {/* Top Reading Progress Bar */}
      <div 
        className="nd-progress-bar" 
        style={{ transform: `scaleX(${scrollProgress / 100})` }} 
        aria-hidden="true" 
      />

      <Header activePage="/news" />

      <main className="news-detail-page">
        <div className="nd-container">
          {/* Breadcrumb */}
          <nav className="nd-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="nd-breadcrumb-link">
              <i className="material-symbols-rounded" aria-hidden="true" >home</i>
              <span>Home</span>
            </Link>
            <i className="material-symbols-rounded nd-breadcrumb-sep" aria-hidden="true" >chevron_right</i>
            <Link to="/news" className="nd-breadcrumb-link">News &amp; Events</Link>
            <i className="material-symbols-rounded nd-breadcrumb-sep" aria-hidden="true" >chevron_right</i>
            <span className="nd-breadcrumb-current">{article.category}</span>
          </nav>

          <article className="nd-article">
            {/* Header */}
            <header className="nd-header">
              <div className="nd-badge-row">
                <span className="nd-badge">
                  <span className="nd-badge-dot" />
                  {article.category}
                </span>
                {article.badge && (
                  <span className="nd-badge nd-badge-highlight">
                    <i className="material-symbols-rounded" aria-hidden="true" >bolt</i>
                    {article.badge}
                  </span>
                )}
              </div>

              <h1 className="nd-title">{article.title}</h1>

              {article.excerpt && (
                <p className="nd-excerpt">{article.excerpt}</p>
              )}

              <div className="nd-byline">
                <div className="nd-author">
                  <div className="nd-avatar-wrapper">
                    <span className="nd-avatar" aria-hidden="true">{initials}</span>
                  </div>
                  <div className="nd-author-info">
                    <span className="nd-author-name">{article.author}</span>
                    <span className="nd-meta">
                      <span>{article.date}</span>
                      <span className="nd-meta-divider">&bull;</span>
                      <span className="nd-read-time">
                        <i className="material-symbols-rounded" aria-hidden="true" >schedule</i>
                        {article.readTime}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="nd-share-toolbar">
                  <span className="nd-share-label">Share:</span>
                  <div className="nd-share-row">
                    {SOCIALS.map((s) => (
                      <a
                        key={s.key}
                        className={`nd-social-btn nd-social-${s.key}`}
                        href={shareLink(s.key, article.title, shareUrl)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Share on ${s.label}`}
                        title={`Share on ${s.label}`}
                      >
                        <BrandIcon name={s.brand} />
                      </a>
                    ))}
                    <button
                      type="button"
                      className={`nd-social-btn nd-copy-btn ${copied ? 'active' : ''}`}
                      onClick={handleCopyLink}
                      aria-label="Copy article link"
                      title="Copy Link"
                    >
                      <i className="material-symbols-rounded" aria-hidden="true" >{copied ? "check" : "link"}</i>
                      {copied && <span className="nd-toast">Copied!</span>}
                    </button>
                    <button
                      type="button"
                      className={`nd-social-btn nd-bookmark-btn ${bookmarked ? 'active' : ''}`}
                      onClick={() => setBookmarked(!bookmarked)}
                      aria-label="Bookmark article"
                      title={bookmarked ? "Bookmarked" : "Bookmark"}
                    >
                      <i className={`material-symbols-rounded${bookmarked ? ' ms-fill' : ''}`} aria-hidden="true" >bookmark</i>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Hero image */}
            <figure className="nd-hero-image">
              <img src={article.image} width="1020" height="540" alt={article.title} />
              <figcaption className="nd-hero-caption">
                <i className="material-symbols-rounded" aria-hidden="true" >photo_camera</i>
                <span>Featured Image &mdash; {article.title}</span>
              </figcaption>
            </figure>

            {/* Layout */}
            <div className="nd-layout">
              {/* Main content */}
              <div className="nd-main">
                <div className="nd-body">
                  {article.body.map((section, i) => (
                    <section className="nd-body-section" key={article.id + '-section-' + i}>
                      <h2 className="nd-section-title">{section.heading}</h2>
                      {section.paragraphs.map((paragraph, j) => {
                        const isList = /^\d+\.\s/.test(paragraph);
                        return isList ? (
                          <div className="nd-highlight-item" key={article.id + '-para-' + i + '-' + j}>
                            <span className="nd-highlight-num">{paragraph.split(' ')[0]}</span>
                            <p className="nd-paragraph nd-paragraph-list">{paragraph.replace(/^\d+\.\s/, '')}</p>
                          </div>
                        ) : (
                          <p className="nd-paragraph" key={article.id + '-para-' + i + '-' + j}>{paragraph}</p>
                        );
                      })}
                    </section>
                  ))}
                </div>

                {/* Tags */}
                <div className="nd-tags-container">
                  <div className="nd-tags-header">
                    <i className="material-symbols-rounded" aria-hidden="true" >sell</i>
                    <span>Article Tags</span>
                  </div>
                  <div className="nd-tags-list">
                    {article.tags.map((tag) => (
                      <Link to="/news" className="nd-tag" key={tag}>
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Back to news link */}
                <div className="nd-navigation-footer">
                  <Link to="/news" className="nd-back-btn">
                    <i className="material-symbols-rounded" aria-hidden="true" >arrow_back</i>
                    <span>Back to all news &amp; events</span>
                  </Link>
                </div>
              </div>

              {/* Sidebar */}
              <aside className="nd-sidebar">
                {/* Recent News Card */}
                <div className="nd-sidebar-card">
                  <div className="nd-sidebar-header">
                    <h3 className="nd-sidebar-title">Recent Updates</h3>
                    <div className="nd-title-indicator" />
                  </div>
                  <div className="nd-sidebar-list">
                    {related.map((item) => (
                      <Link to={`/news/${item.id}`} className="nd-sidebar-item" key={item.id}>
                        <div className="nd-sidebar-thumb">
                          <img src={item.image} alt={item.title} width="160" height="106" loading="lazy" />
                        </div>
                        <div className="nd-sidebar-info">
                          <span className="nd-sidebar-category">{item.category}</span>
                          <h4 className="nd-sidebar-item-title">{item.title}</h4>
                          <span className="nd-sidebar-date">
                            <i className="material-symbols-rounded" aria-hidden="true" >calendar_month</i>
                            {item.date}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Categories Card */}
                <div className="nd-sidebar-card">
                  <div className="nd-sidebar-header">
                    <h3 className="nd-sidebar-title">Categories</h3>
                    <div className="nd-title-indicator" />
                  </div>
                  <ul className="nd-category-list">
                    {CATEGORIES.map((cat) => {
                      const count = newsData.filter((n) => n.category === cat).length;
                      const isActive = article.category === cat;
                      return (
                        <li key={cat}>
                          <Link
                            to={`/news?cat=${encodeURIComponent(cat.toLowerCase().replace(/\s+/g, '-'))}`}
                            className={`nd-category-link ${isActive ? 'active' : ''}`}
                          >
                            <span className="nd-category-name">
                              <i className="material-symbols-rounded" aria-hidden="true" >folder_open</i>
                              {cat}
                            </span>
                            <span className="nd-category-count">{count}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Support/Contact Banner Card */}
                <div className="nd-sidebar-card nd-contact-card">
                  <div className="nd-contact-icon">
                    <i className="material-symbols-rounded" aria-hidden="true" >support_agent</i>
                  </div>
                  <h3 className="nd-contact-title">Have Questions?</h3>
                  <p className="nd-contact-text">
                    Need assistance or further details regarding this announcement? Our team is always ready to guide you.
                  </p>
                  <Link to="/about" className="nd-contact-btn">
                    <span>Contact Support</span>
                    <i className="material-symbols-rounded" aria-hidden="true" >arrow_forward</i>
                  </Link>
                </div>
              </aside>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </>
  );
}