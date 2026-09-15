import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

export default function NotFound() {
  return (
    <>
      <Header activePage="" />
      <main
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(4rem, 15vw, 10rem)',
            fontWeight: 700,
            lineHeight: 1,
            margin: 0,
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </h1>
        <p style={{ margin: '16px 0 32px', fontSize: '1.6rem', color: '#616366' }}>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#6C63FF',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1.4rem',
          }}
        >
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
