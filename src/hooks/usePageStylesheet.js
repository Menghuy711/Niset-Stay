import { useEffect } from 'react';

/**
 * The original static site shipped ONE dedicated CSS file per page
 * (style.css, rent.css, room-detail.css, login.css, signin.css, news.css).
 * Each of those files is a near-complete, independent copy of the base
 * stylesheet with page-specific tweaks (not a small diff on top of a shared
 * file) — so in a single-page app we can't just import all six globally,
 * they'd fight each other on shared class names like `.card` or `.header`.
 *
 * This hook reproduces the original "one stylesheet active at a time"
 * behaviour: it injects a <link> tag for the given stylesheet URL when the
 * page mounts, and removes it when the page unmounts / the route changes.
 */
export default function usePageStylesheet(href) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.pageStylesheet = 'true';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [href]);
}
