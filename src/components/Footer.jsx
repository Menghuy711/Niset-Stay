import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import facebookIcon from '../assets/images/facebook.svg';
import twitterIcon from '../assets/images/twitter.svg';
import instaIcon from '../assets/images/insta.svg';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="container">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <img src={logo} width="260" height="40" alt="Niset Stay" />
            </Link>

            <p className="body-medium footer-text">
              Escape the campus rush. Niset Stay gives university students a quiet, comfortable sanctuary to come home
              to. Study hard, sleep better, and enjoy a space that&rsquo;s truly yours.
            </p>
          </div>

          <nav className="footer-nav" aria-labelledby="nav-label-1">
            <p className="title-small footer-list-title" id="nav-label-1">Quick Link</p>
            <ul className="footer-list">
              <li><Link to="/" className="body-medium footer-link">Home</Link></li>
              <li><Link to="/rent" className="body-medium footer-link">Rent</Link></li>
              <li><Link to="/news" className="body-medium footer-link">News &amp; Events</Link></li>
              <li><Link to="/about" className="body-medium footer-link">About Us</Link></li>
            </ul>
          </nav>

          <nav className="footer-nav" aria-labelledby="nav-label-3">
            <p className="title-small footer-list-title" id="nav-label-3">Get in touch</p>
            <ul className="footer-list">
              <li><a href="#" className="body-medium footer-link">houseandroom@nisetstay.com</a></li>
              <li>
                <address className="address body-medium">
                  Teuk Thla, Sen Sok, Phnom Penh, Cambodia
                </address>
              </li>
              <li>
                <ul className="social-list">
                  <li>
                    <a href="https://www.facebook.com/gotopheapb?mibextid=wwXIfr&mibextid=wwXIfr" className="social-link">
                      <img src={facebookIcon} alt="facebook" />
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/gotopheap_b?s=11" className="social-link">
                      <img src={twitterIcon} alt="twitter" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com/gotopheap.b?igsh=MTU2ZWt5a2JjYnRwZQ%3D%3D&utm_source=qr" className="social-link">
                      <img src={instaIcon} alt="instagram" />
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p className="copyright body-medium">
            Copyright 2026 codebyNisetStay
          </p>
        </div>
      </div>
    </footer>
  );
}
