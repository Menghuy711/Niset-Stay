import { useState, useEffect } from 'react';
import newsDetailCssUrl from '../assets/css/news-detail.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Link, useParams } from 'react-router-dom';
import newsData from '../data/newsData.js';

const SOCIALS = [
  { key: 'fb', label: 'Facebook', icon: 'fab fa-facebook-f' },
  { key: 'tw', label: 'Twitter', icon: 'fab fa-twitter' },
  { key: 'te', label: 'Telegram', icon: 'fab fa-telegram' },
  { key: 'wa', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
];

const CATEGORIES = ['Scholarship', 'Event', 'News', 'Announcement'];

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
  const article = newsData.find((n) => String(n.id) === id) || newsData[0];
  const related = newsData.filter((n) => n.id !== article.id).slice(0, 3);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const initials = article.author
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
        style={{ width: `${scrollProgress}%` }} 
        aria-hidden="true" 
      />

      <Header activePage="/news" />

      <main className="news-detail-page">
        <div className="nd-container">
          {/* Breadcrumb */}
          <nav className="nd-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="nd-breadcrumb-link">
              <i className="fa-solid fa-house" />
              <span>Home</span>
            </Link>
            <i className="fa-solid fa-chevron-right nd-breadcrumb-sep" />
            <Link to="/news" className="nd-breadcrumb-link">News &amp; Events</Link>
            <i className="fa-solid fa-chevron-right nd-breadcrumb-sep" />
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
                    <i className="fa-solid fa-bolt" />
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
                        <i className="fa-regular fa-clock" />
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
                        <i className={s.icon} />
                      </a>
                    ))}
                    <button
                      type="button"
                      className={`nd-social-btn nd-copy-btn ${copied ? 'active' : ''}`}
                      onClick={handleCopyLink}
                      aria-label="Copy article link"
                      title="Copy Link"
                    >
                      <i className={copied ? "fa-solid fa-check" : "fa-solid fa-link"} />
                      {copied && <span className="nd-toast">Copied!</span>}
                    </button>
                    <button
                      type="button"
                      className={`nd-social-btn nd-bookmark-btn ${bookmarked ? 'active' : ''}`}
                      onClick={() => setBookmarked(!bookmarked)}
                      aria-label="Bookmark article"
                      title={bookmarked ? "Bookmarked" : "Bookmark"}
                    >
                      <i className={bookmarked ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Hero image */}
            <figure className="nd-hero-image">
              <img src={article.image} alt={article.title} />
              <figcaption className="nd-hero-caption">
                <i className="fa-solid fa-camera" />
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
                    <i className="fa-solid fa-tags" />
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
                    <i className="fa-solid fa-arrow-left" />
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
                          <img src={item.image} alt={item.title} />
                        </div>
                        <div className="nd-sidebar-info">
                          <span className="nd-sidebar-category">{item.category}</span>
                          <h4 className="nd-sidebar-item-title">{item.title}</h4>
                          <span className="nd-sidebar-date">
                            <i className="fa-regular fa-calendar-days" />
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
                          <Link to="/news" className={`nd-category-link ${isActive ? 'active' : ''}`}>
                            <span className="nd-category-name">
                              <i className="fa-solid fa-folder-open" />
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
                    <i className="fa-solid fa-headset" />
                  </div>
                  <h3 className="nd-contact-title">Have Questions?</h3>
                  <p className="nd-contact-text">
                    Need assistance or further details regarding this announcement? Our team is always ready to guide you.
                  </p>
                  <Link to="/about" className="nd-contact-btn">
                    <span>Contact Support</span>
                    <i className="fa-solid fa-arrow-right" />
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