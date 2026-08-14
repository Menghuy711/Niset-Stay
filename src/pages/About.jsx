import { useEffect, useRef, useState } from 'react';
import loginCssUrl from '../assets/css/login.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import banner1 from '../assets/images/login-banner-1.jpg';
import banner2 from '../assets/images/banner-2.jpg';
import lorMenghuyPhoto from '../assets/images/lor-menghuy.png';
import heangSokunPhoto from '../assets/images/heang-sokun.png';
import researchersRupp from '../assets/images/researchers_rupp.webp';

export default function About() {
  usePageStylesheet(loginCssUrl);
  const [submitted, setSubmitted] = useState(false);
  const submitTimeoutRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => () => clearTimeout(submitTimeoutRef.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    submitTimeoutRef.current = setTimeout(() => {
      setSubmitted(false);
      formRef.current?.reset();
    }, 2500);
  };

  return (
    <>
      <Header activePage="/about" />

      <main>
        <article>
          {/* HERO BANNER */}
          <section className="about-hero" id="about-hero" style={{ backgroundImage: `url(${researchersRupp})` }}>
            <div className="about-hero-overlay" />
            <div className="about-hero-content">
              <span className="about-hero-badge">About Us</span>
              <h1 className="about-hero-title">We Help Students Find Their <span>Perfect Home</span></h1>
              <p className="about-hero-text">A trusted platform connecting university students with safe, comfortable, and affordable accommodation across Cambodia.</p>
              <a href="#about-contact" className="about-hero-btn">
                <i className="fa-solid fa-paper-plane" /> Get In Touch
              </a>
            </div>
          </section>

          {/* MISSION SECTION */}
          <section className="about-mission" id="about-mission">
            <div className="about-container">
              <div className="about-mission-grid">
                <figure className="about-mission-img">
                  <img src={banner1} width="1020" height="690" loading="lazy" alt="Royal University of Phnom Penh" className="img-cover" />
                </figure>

                <div className="about-mission-card">
                  <div className="about-section-label">
                    <i className="fa-solid fa-bullseye" />
                    <span>Our Mission</span>
                  </div>
                  <h2 className="about-section-title">Find Your Perfect Student Home Away From Home</h2>
                  <p className="about-mission-text">
                    At Niset Stay, we are committed to helping students find comfortable, safe, and affordable
                    accommodation that fits their needs. We understand that moving to a new city for education can be
                    both exciting and challenging, which is why we provide a simple and reliable platform for finding
                    the perfect place to live.
                  </p>
                  <p className="about-mission-text">
                    Whether you are looking for a private room, shared housing, or a full apartment, we offer a wide
                    range of verified rental options near universities, schools, and essential services.
                  </p>

                  <ul className="about-feature-list">
                    {['Affordable Housing', 'Verified & Safe Properties', 'Prime Student Locations', 'Trusted Support Service'].map((item) => (
                      <li className="about-feature-item" key={item}>
                        <div className="about-feature-icon"><i className="fa-solid fa-circle-check" /></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* STATS STRIP */}
          <section className="about-stats">
            <div className="about-container">
              <div className="about-stats-grid">
                {[
                  { icon: 'fa-users', number: '500+', label: 'Students Helped' },
                  { icon: 'fa-house-chimney', number: '200+', label: 'Verified Rooms' },
                  { icon: 'fa-location-dot', number: '50+', label: 'Locations' },
                  { icon: 'fa-headset', number: '24/7', label: 'Support' },
                ].map((stat) => (
                  <div className="about-stat-item" key={stat.label}>
                    <div className="about-stat-icon"><i className={`fa-solid ${stat.icon}`} /></div>
                    <div className="about-stat-number">{stat.number}</div>
                    <div className="about-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* DEVELOPER SECTION */}
          <section className="about-developer" id="about-developer">
            <div className="about-container">
              <div className="about-developer-grid">
                <figure className="about-developer-img">
                  <img src={banner2} width="1020" height="690" loading="lazy" alt="Hen Sopheap — Developer" className="img-cover" />
                </figure>

                <div className="about-developer-card">
                  <div className="about-section-label">
                    <i className="fa-solid fa-code" />
                    <span>Meet the Developer</span>
                  </div>
                  <h2 className="about-section-title">Hen Sopheap</h2>
                  <p className="about-developer-role">IT Engineering Student at RUPP</p>
                  <p className="about-developer-text">
                    Hen Sopheap is a passionate Information Technology Engineering student at the Royal University of
                    Phnom Penh (RUPP) with a strong interest in web development, software solutions, and digital
                    innovation.
                  </p>
                  <p className="about-developer-text">
                    As the developer of Niset Stay, Sopheap is dedicated to creating a user-friendly platform that
                    helps students find safe, comfortable, and affordable accommodation with ease. His goal is to
                    combine technology and practical solutions to simplify the housing search process.
                  </p>

                  <div className="about-social-links">
                    <a href="mailto:Hensopheap18@gmail.com" className="about-social-link" aria-label="Email">
                      <i className="fa-solid fa-envelope" />
                      <span>Hensopheap18@gmail.com</span>
                    </a>
                    <a href="https://www.instagram.com/gotopheap.b" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Instagram">
                      <i className="fa-brands fa-instagram" />
                      <span>@gotopheap_b</span>
                    </a>
                    <a href="https://www.facebook.com/gotopheapb" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Facebook">
                      <i className="fa-brands fa-facebook" />
                      <span>Bunsang Sopheap</span>
                    </a>
                    <a href="https://t.me/ismesopheap_b" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Telegram">
                      <i className="fa-brands fa-telegram" />
                      <span>@ismesopheap_b</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TEAM SECTION */}
          <section className="about-team" id="about-team">
            <div className="about-container">
              <div className="about-team-header">
                <div className="about-section-label">
                  <i className="fa-solid fa-users" />
                  <span>Meet the Team</span>
                </div>
                <h2 className="about-section-title">The People Behind Niset Stay</h2>
              </div>

              <div className="about-team-grid">
                {[
                  {
                    photo: lorMenghuyPhoto,
                    name: 'Lor Menghuy',
                    role: 'Team Member',
                  },
                  {
                    photo: heangSokunPhoto,
                    name: 'Heang Sokun',
                    role: 'Team Member',
                  },
                ].map((member) => (
                  <div className="about-team-card" key={member.name}>
                    <figure className="about-team-img">
                      <img src={member.photo} width="400" height="400" loading="lazy" alt={`${member.name} — ${member.role}`} className="img-cover" />
                    </figure>
                    <h3 className="about-team-name">{member.name}</h3>
                    <p className="about-team-role">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CONTACT FORM SECTION */}
          <section className="about-contact" id="about-contact">
            <div className="about-container">
              <div className="about-contact-header">
                <div className="about-section-label">
                  <i className="fa-solid fa-envelope-open-text" />
                  <span>Contact</span>
                </div>
                <h2 className="about-section-title">Send Us a Message</h2>
                <p className="about-contact-subtitle">Have questions about room rentals, student accommodation, or our services? We're here to help.</p>
              </div>

              <div className="about-contact-grid">
                <div className="about-contact-info">
                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="fa-solid fa-map-location-dot" /></div>
                    <div className="about-info-content">
                      <h4 className="about-info-title">Address</h4>
                      <p>Phnom Penh</p>
                      <p>Cambodia</p>
                    </div>
                  </div>

                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="fa-solid fa-phone-volume" /></div>
                    <div className="about-info-content">
                      <h4 className="about-info-title">Phone</h4>
                      <p>+855 978365437</p>
                      <p>+855 889767354</p>
                    </div>
                  </div>

                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="fa-solid fa-at" /></div>
                    <div className="about-info-content">
                      <h4 className="about-info-title">Email</h4>
                      <p>houseandroom@nisetstay.com</p>
                      <p>info@nisetstay.com</p>
                    </div>
                  </div>
                </div>

                <div className="about-contact-form-card">
                  <form className="about-contact-form" ref={formRef} onSubmit={handleSubmit}>
                    <div className="about-form-group">
                      <div className="about-input-wrapper">
                        <i className="fa-solid fa-user" />
                        <input type="text" placeholder="Your Full Name" required />
                      </div>
                    </div>

                    <div className="about-form-group">
                      <div className="about-input-wrapper">
                        <i className="fa-solid fa-envelope" />
                        <input type="email" placeholder="Your Email Address" required />
                      </div>
                    </div>

                    <div className="about-form-group">
                      <div className="about-input-wrapper">
                        <i className="fa-solid fa-tag" />
                        <input type="text" placeholder="Subject" />
                      </div>
                    </div>

                    <div className="about-form-group about-form-group-full">
                      <div className="about-input-wrapper about-textarea-wrapper">
                        <i className="fa-solid fa-message" />
                        <textarea placeholder="Write your message here..." rows="5" required />
                      </div>
                    </div>

                    <button type="submit" className="about-submit-btn">
                      {submitted ? (
                        <><i className="fa-solid fa-check" /> <span>Message Sent!</span></>
                      ) : (
                        <><i className="fa-solid fa-paper-plane" /> <span>Send Message</span></>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
