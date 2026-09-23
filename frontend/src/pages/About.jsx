import { useEffect, useRef, useState } from 'react';
import aboutCssUrl from '../assets/css/about.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import banner1 from '../assets/images/login-banner-1.jpg';
import banner2 from '../assets/images/banner-2.jpg';
import lorMenghuyPhoto from '../assets/images/lor-menghuy.jpg';
import heangSokunPhoto from '../assets/images/heang-sokun.jpg';
import researchersRupp from '../assets/images/researchers_rupp.webp';
import BrandIcon from '../components/BrandIcon.jsx';

export default function About() {
  const cssReady = usePageStylesheet(aboutCssUrl);
  const [submitted, setSubmitted] = useState(false);
  const submitTimeoutRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => () => clearTimeout(submitTimeoutRef.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // No server contact endpoint exists, so compose the visitor's message into
    // a mailto: and let their mail client deliver it. Far better than a form
    // that silently "thanks" the user without sending anything.
    const form = formRef.current;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const subject = String(data.get('subject') || 'Contact request from Niset Stay website').trim();
    const message = String(data.get('message') || '').trim();

    const recipient = 'houseandroom@nisetstay.com';
    const body = `${message}\n\n— ${name}${email ? ` (${email})` : ''}`;
    window.location.href =
      `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setSubmitted(true);
    submitTimeoutRef.current = setTimeout(() => {
      setSubmitted(false);
      formRef.current?.reset();
    }, 4000);
  };

  if (!cssReady) return <PageLoader />;

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
                <i className="material-symbols-rounded" aria-hidden="true" >send</i> Get In Touch
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
                    <i className="material-symbols-rounded" aria-hidden="true" >track_changes</i>
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
                        <div className="about-feature-icon"><i className="material-symbols-rounded" aria-hidden="true" >check_circle</i></div>
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
                  { icon: 'group', number: '500+', label: 'Students Helped' },
                  { icon: 'home', number: '200+', label: 'Verified Rooms' },
                  { icon: 'location_on', number: '50+', label: 'Locations' },
                  { icon: 'support_agent', number: '24/7', label: 'Support' },
                ].map((stat) => (
                  <div className="about-stat-item" key={stat.label}>
                    <div className="about-stat-icon"><i className="material-symbols-rounded" aria-hidden="true" >{stat.icon}</i></div>
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
                    <i className="material-symbols-rounded" aria-hidden="true" >code</i>
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
                      <i className="material-symbols-rounded" aria-hidden="true" >mail</i>
                      <span>Hensopheap18@gmail.com</span>
                    </a>
                    <a href="https://www.instagram.com/gotopheap.b" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Instagram">
                      <BrandIcon name="instagram" />
                      <span>@gotopheap_b</span>
                    </a>
                    <a href="https://www.facebook.com/gotopheapb" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Facebook">
                      <BrandIcon name="facebook" />
                      <span>Bunsang Sopheap</span>
                    </a>
                    <a href="https://t.me/ismesopheap_b" className="about-social-link" target="_blank" rel="noreferrer" aria-label="Telegram">
                      <BrandIcon name="telegram" />
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
                  <i className="material-symbols-rounded" aria-hidden="true" >group</i>
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
                  <i className="material-symbols-rounded" aria-hidden="true" >mark_email_read</i>
                  <span>Contact</span>
                </div>
                <h2 className="about-section-title">Send Us a Message</h2>
                <p className="about-contact-subtitle">Have questions about room rentals, student accommodation, or our services? We're here to help.</p>
              </div>

              <div className="about-contact-grid">
                <div className="about-contact-info">
                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="material-symbols-rounded" aria-hidden="true" >location_searching</i></div>
                    <div className="about-info-content">
                      <h3 className="about-info-title">Address</h3>
                      <p>Phnom Penh</p>
                      <p>Cambodia</p>
                    </div>
                  </div>

                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="material-symbols-rounded" aria-hidden="true" >support_agent</i></div>
                    <div className="about-info-content">
                      <h3 className="about-info-title">Phone</h3>
                      <p>+855 978365437</p>
                      <p>+855 889767354</p>
                    </div>
                  </div>

                  <div className="about-info-card">
                    <div className="about-info-icon"><i className="material-symbols-rounded" aria-hidden="true" >alternate_email</i></div>
                    <div className="about-info-content">
                      <h3 className="about-info-title">Email</h3>
                      <p>houseandroom@nisetstay.com</p>
                      <p>info@nisetstay.com</p>
                    </div>
                  </div>
                </div>

                <div className="about-contact-form-card">
                  <form className="about-contact-form" ref={formRef} onSubmit={handleSubmit}>
                    {submitted && (
                      <p className="about-form-note">
                        <i className="material-symbols-rounded" aria-hidden="true" >check_circle</i>
                        Your email app should open with your message ready to send. If it didn't, write to houseandroom@nisetstay.com.
                      </p>
                    )}

                    <div className="about-form-group">
                      <label className="about-form-label" htmlFor="about-contact-name">Your Full Name</label>
                      <div className="about-input-wrapper">
                        <i className="material-symbols-rounded" aria-hidden="true" >person</i>
                        <input id="about-contact-name" name="name" type="text" placeholder="e.g. Sokha" required />
                      </div>
                    </div>

                    <div className="about-form-group">
                      <label className="about-form-label" htmlFor="about-contact-email">Email Address</label>
                      <div className="about-input-wrapper">
                        <i className="material-symbols-rounded" aria-hidden="true" >mail</i>
                        <input id="about-contact-email" name="email" type="email" placeholder="you@university.edu" required />
                      </div>
                    </div>

                    <div className="about-form-group">
                      <label className="about-form-label" htmlFor="about-contact-subject">Subject</label>
                      <div className="about-input-wrapper">
                        <i className="material-symbols-rounded" aria-hidden="true" >sell</i>
                        <input id="about-contact-subject" name="subject" type="text" placeholder="e.g. Availability near RUPP" />
                      </div>
                    </div>

                    <div className="about-form-group about-form-group-full">
                      <label className="about-form-label" htmlFor="about-contact-message">Message</label>
                      <div className="about-input-wrapper about-textarea-wrapper">
                        <i className="material-symbols-rounded" aria-hidden="true" >message</i>
                        <textarea id="about-contact-message" name="message" placeholder="Write your message here..." rows="5" required />
                      </div>
                    </div>

                    <button type="submit" className="about-submit-btn">
                      <><i className="material-symbols-rounded" aria-hidden="true" >send</i> <span>Send Message</span></>
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
