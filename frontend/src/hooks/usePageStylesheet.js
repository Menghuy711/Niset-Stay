import { useEffect, useState, useRef } from 'react';

/**
 * Dynamically injects a page-level stylesheet and returns whether it has
 * finished loading.  The consumer can gate its render on the returned boolean
 * to avoid the Flash of Unstyled Content (FOUC) that occurred when the old
 * implementation just appended a <link> and hoped for the best.
 *
 * Key improvements over the original version:
 *  1. Returns `loaded` so each page can show a spinner until CSS is ready.
 *  2. Reuses an already-present <link> for the same href (avoids duplicate
 *     downloads when the user navigates back to a page they already visited).
 *  3. Cleans up only the <link> tags *this* instance created on unmount.
 */

// Module-level set of hrefs whose stylesheets have been fully loaded at least
// once during this session.  Lets us skip the loading gate on repeat visits.
const loadedCache = new Set();

export default function usePageStylesheet(href) {
  const [loaded, setLoaded] = useState(() => loadedCache.has(href));
  const linkRef = useRef(null);

  useEffect(() => {
    // If a <link> for this href already exists in <head> (e.g. the user
    // navigated back), reuse it instead of creating a duplicate.
    let link = document.querySelector(`link[data-page-stylesheet][href="${href}"]`);
    let isOwner = false; // only remove if *we* created it

    if (link) {
      // Already in the DOM — mark as loaded immediately.
      loadedCache.add(href);
      setLoaded(true);
    } else {
      // Create and inject a new <link>.
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.pageStylesheet = 'true';
      isOwner = true;

      link.onload = () => {
        loadedCache.add(href);
        setLoaded(true);
      };

      link.onerror = () => {
        // Even on failure, unblock the page so it doesn't hang forever.
        console.warn(`[usePageStylesheet] Failed to load: ${href}`);
        setLoaded(true);
      };

      document.head.appendChild(link);
    }

    linkRef.current = { link, isOwner };

    return () => {
      const ref = linkRef.current;
      if (ref?.isOwner && ref.link.parentNode) {
        ref.link.parentNode.removeChild(ref.link);
      }
      setLoaded(false);
    };
  }, [href]);

  return loaded;
}
