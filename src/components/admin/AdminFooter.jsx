export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="admin-footer">
      <div className="admin-footer-container">
        <div className="admin-footer-left">
          <p className="admin-footer-text">
            © {currentYear} Niset Stay. All rights reserved.
          </p>
        </div>
        <div className="admin-footer-right">
          <a href="#" className="admin-footer-link">Privacy Policy</a>
          <span className="admin-footer-separator">•</span>
          <a href="#" className="admin-footer-link">Terms of Service</a>
          <span className="admin-footer-separator">•</span>
          <a href="#" className="admin-footer-link">Support</a>
        </div>
      </div>
    </footer>
  );
}
