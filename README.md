# Niset Stay — React (Vite) Migration

This is the React/Vite port of the original static "Niset Stay" site, built from
`implementation_plan.md`. It was assembled in a sandboxed environment with **no
network access**, so `npm install` has not been run and the build has not been
verified in a real browser — please do that first on your machine.

## Getting started

```bash
cd niset-stay-react
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

## Structure

- `src/pages/` — one component per original page (`Home`, `Rent`, `RoomDetail`
  through `RoomDetail04`, `Login` (About Us), `Signin`, `News`)
- `src/components/` — `Header`, `Footer`, `PropertyCard`, `FeatureSections`,
  `StorySection`, `RoomDetailTemplate` (shared by all 4 room-detail pages),
  `ScrollToTop`
- `src/data/` — extracted content as plain data: `homeProperties.js` (8 cards),
  `rentProperties.js` (20 cards), `stories.js`, `roomDetails.js`
- `src/assets/css/` — the original 6 stylesheets, copied as-is
- `src/assets/images/` — all images from the 6 original asset folders, merged
  and de-duplicated by content hash (see "Image de-duplication" below)
- `src/hooks/usePageStylesheet.js` — see "Per-page CSS" below

## Design decisions / things to double check

### Per-page CSS
The original site loads exactly **one** CSS file per page, and each of those
six files is a nearly-complete independent copy of the base stylesheet (not a
small diff layered on top) — `rent.css` alone re-defines `.card`, `.header`,
`.footer`, etc. In a single-page app all pages share one document, so we can't
just import all six globally without them overriding each other unpredictably
as you navigate.

Instead, `usePageStylesheet(url)` injects a `<link rel="stylesheet">` for the
current page's CSS on mount and removes it on unmount, so only one page
stylesheet is ever active — reproducing the original per-page-load behavior.
This is the one meaningfully "clever" piece of this migration; worth reviewing
if pages look off after `npm run dev`.

### Image de-duplication
Six asset folders were merged into `src/assets/images/`. Files with the same
name and identical content were merged into one; a few files share a name but
have **different** content across folders, so they were kept as separate files
with a folder-tag prefix:
- `login-banner-1.jpg` (from `assets-login`) vs. plain `banner-1.jpg` (from
  `assets-rent`/`assets-roomdetail`, byte-identical to each other)
- `news-banner-1.jpg` / `news-banner-2.jpg` (from `assets-news`)
- `signin-logo.png` (from `assets-signin` — actually unused by any page, kept
  for completeness)

### Mobile nav icon toggle
The original site is slightly inconsistent: on `index.html` only, clicking the
hamburger toggles *both* the navbar and the button's own icon-swap class; on
every other page's script, only the navbar toggles (the button's `menu`/`close`
icon never swaps because `.nav-toggle-btn.active` is never set). This looks
like an unintentional bug rather than a deliberate difference. The shared
`Header.jsx` toggles both together everywhere (the nicer, working behavior) —
flagging this in case you want it to match the original bug exactly on 8 of
the 9 pages instead.

### News page HTML
`news.html`'s second feature section had an unclosed `<p>` tag and a missing
closing `<div>` in the original markup. Fixed during conversion (JSX requires
well-formed tags) — the visible content is unchanged.

### Contact form "success" animation on the About page
The original `login.html` contact form had no submit handler at all in any of
its JS files (it would just do a full page reload against `action="#"`). I
added a small `preventDefault` + "Message Sent!" state, matching the pattern
already used on the room-detail contact forms, since a raw non-functional
submit button didn't make sense to carry over into a routed SPA. Let me know
if you'd rather it do nothing, like the original.

### Bootstrap
Not included — confirmed unused in any of the original HTML files (same
conclusion as the implementation plan).

## Verification checklist (from the implementation plan — please run these)

1. `npm run build` compiles without errors
2. `npm run dev` starts and serves all 9 routes
3. Compare each route side-by-side against the original HTML files
4. Mobile nav toggle (hamburger)
5. Header scroll state (background changes after 50px scroll)
6. Favorite heart toggle on property cards
7. Lightbox on room-detail pages: open, close, prev/next, arrow keys, Escape
8. Login/Register tab switching on `/signin`, plus password show/hide and
   confirm-password validation
9. Contact form submit animation on room-detail and about pages
10. Responsive layout at mobile/tablet/desktop breakpoints
11. Internal navigation via React Router; external social/Google Form links
    still open correctly
