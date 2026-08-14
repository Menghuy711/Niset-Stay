import { Link } from 'react-router-dom';
import newsCssUrl from '../assets/css/news.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import newsData from '../data/newsData.js';
import newsHero from '../assets/images/news-hero.webp';

export default function News() {
  usePageStylesheet(newsCssUrl);

  return (
    <>
      <Header activePage="/news" />

      <main>
        <article>
          <section
            className="news-hero"
            aria-label="News and Events banner"
            style={{
              backgroundImage: `linear-gradient(rgba(7, 24, 51, 0.6), rgba(7, 24, 51, 0.6)), url(${newsHero})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="news-hero-content">
              <h1 className="headline-large">News & Events</h1>
              <p className="body-large">Stay updated with the latest happenings, scholarships, and announcements</p>
            </div>
          </section>

          <section className="section news-section" aria-labelledby="news-section-label">
            <div className="container">
              <div className="news-grid">
                {newsData.map((item) => (
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
                        <span className={`news-category category-${item.category.toLowerCase()}`}>
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
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
