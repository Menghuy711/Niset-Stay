import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import notfoundCssUrl from '../assets/css/notfound.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import PageLoader from '../components/PageLoader.jsx';

export default function NotFound() {
  const cssReady = usePageStylesheet(notfoundCssUrl);
  if (!cssReady) return <PageLoader />;
  return (
    <>
      <Header activePage="" />
      <main className="nf-main">
        <h1 className="nf-code">404</h1>
        <p className="nf-message">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="nf-home-link">
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}