---
name: Niset Stay
description: A quiet, comfortable home for university students — the Campus Sanctuary.
colors:
  primary: "#1B61CC"
  primary-hover: "#1755B2"
  primary-active: "#134DA0"
  primary-deep: "#0F4692"
  navy: "#0D3166"
  midnight: "#071833"
  cyan: "#21FFFF"
  sun: "#F6BD26"
  error: "#FF2134"
  success: "#22C55E"
  paper: "#FAFCFF"
  cloud: "#F2F5FA"
  mist: "#E9ECF2"
  fog: "#DADFE5"
  haze: "#C2C6CC"
  silver: "#919499"
  stone: "#797C80"
  slate: "#616366"
  graphite: "#494A4D"
  ink: "#303133"
  coal: "#18191A"
  obsidian: "#0C0C0D"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(3.6rem, 6vw, 7.2rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.25px"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "2.8rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 600
    letterSpacing: "0.5px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "32px"
  full: "1000px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
  icon-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.coal}"
    rounded: "{rounded.sm}"
    size: "44px"
  badge:
    backgroundColor: "{colors.cyan}"
    rounded: "{rounded.sm}"
    height: "32px"
  field:
    backgroundColor: "{colors.mist}"
    rounded: "{rounded.md}"
---

# Design System: Niset Stay

## Overview

**Creative North Star: "The Campus Sanctuary"**

Niset Stay is a student-housing site, and its interface is built to feel like the front desk of a well-run residence hall: friendly, assured, and quietly trustworthy. The design leans on a cool trust-blue family — bright enough to earn a click, deep enough (navy, midnight) to carry full-screen atmosphere without noise — set over cool paper neutrals that keep real room photos and pricing the visual center of attention. Cyan is reserved as the single spark of campus life: badges and rare ambient signals, never decorative wallpaper.

The system is mobile-first and rounded: pill-shaped action buttons, 16px-radius cards, 12px-radius fields, and a layered depth model where flat tonal surfaces rest on the neutral ramp and lift with soft offset shadows rather than hard borders. Hover is a 200ms contract with the user (color fills, faint shadows, a 2deg image tilt), deliberately quick and smooth so a room search feels decisive, not hesitant. On the operator side, the admin dashboard shares the same tokens — navy chrome, the same Montserrat, the same radius language — so a student and a property manager are explicitly using the same trusted product.

Both the public experience and the admin surface speak with one voice: calm blue authority, generous air, honest room facts in real photos.

**Key Characteristics:**
- Rounded and assured: pill buttons, soft-cornered cards and modals, generous spacing.
- Cool trust-blue authority: primary actions and links live on the blue ramp; deep navy/midnight carries full-screen tone.
- Cyan as a rare spark: badges and status signals, the "campus life" accent kept scarce.
- Layered tonal depth: flat resting surfaces, soft offset shadows, flat-by-default.
- One typeface, Montserrat, across public pages and the admin dashboard.

## Colors

A cool, sky-to-midnight blue system over cool paper neutrals — campus daylight above, trustworthy night-blue stored as surface tone.

### Primary
- **Campus Trust-Blue** (`#1B61CC`): the action color. Filled primary buttons, feature icons, search icon, active `.navbar-link` states, story subtitles, link hovers. Reserved for the primary action of a view. ≥4.5:1 against white, Cool Paper, and Cloud White.
- **Campus Trust-Blue Hover** (`#1755B2`): filled-button hover/focus, with shadow-1.
- **Campus Trust-Blue Press** (`#134DA0`): filled-button active/focus-visible.
- **Campus Trust-Blue Deep** (`#0F4692`): deepest press state (search button).
- **Midnight Navy** (`#0D3166`): the scroll-compressed header, and the admin navbar. A full-width trust band.
- **Ink Midnight** (`#071833`): the footer span. The darkest atmospheric surface.

### Secondary
- **Campus Cyan** (`#21FFFF`): badges on room cards, the "book now" ribbon in the gradient palette, modal title ribbons, thin accents. The rare spark — used sparingly so it stays a privilege.
- **Seaweed Night** (`#073333`): the dark companion to cyan, used only in dark-context detailing.

### Tertiary
- **Campus Sun** (`#F6BD26`): filled star ratings in the Story section and rating widgets. The only warm note; never used for structure.

### Neutral
- **Cool Paper** (`#FAFCFF`): card surfaces, popover panels, text on dark. The brightest neutral, faintly blue.
- **Cloud White** (`#F2F5FA`): the page background. Cooler than pure white so photos stay warm.
- **Mist** (`#E9ECF2`): field hover/focus fills, subtle chrome.
- **Fog** (`#DADFE5`): borders and dividers — card meta rules, field separators, scrollbar track.
- **Haze** (`#C2C6CC`): secondary chrome like scrollbar thumbs.
- **Silver** (`#919499`): mid-tone chrome, subdued icons.
- **Stone** (`#797C80`): placeholder and disabled text.
- **Slate** (`#616366`): secondary body text, card descriptions.
- **Graphite** (`#494A4D`): default nav-link color.
- **Ink** (`#303133`): card titles and meta text.
- **Coal** (`#18191A`): icon-button icons, near-black emphasis.
- **Obsidian** (`#0C0C0D`): body text at full emphasis.
- **Status Red** (`#FF2134`): errors, favorite toggles, destructive states.
- **Status Green** (`#22C55E`): success and confirmation states (booking statuses).

### Named Rules
**The Rarity Rule.** Campus Cyan appears on far less than 10% of any single screen. Its scarcity is the point — when cyan shows up, the eye reads "notice this."

**The Two-Blue Rule.** Campus Trust-Blue is for action: clickable, hoverable, active. Midnight Navy and Ink Midnight are for atmosphere: headers, footers, full-bleed bands. Never invert the jobs.

## Typography

**Display Font:** Montserrat (with `sans-serif` fallback)
**Body Font:** Montserrat (with `sans-serif` fallback)

**Character:** A single geometric grotesque across the whole system — round counters, neutral voice, universally legible. Montserrat carries both the giant hero headline and dense body text without a second face: friendly at 7rem, disciplined at 1.4rem. There is no label/mono font; data (prices, sqft, dates) uses the same family with semibold weight.

### Hierarchy
- **Display** (700, clamp 3.6→7.2rem, lh 1.2–1.3): hero headline and large section openers. Scales up at 768px and again at 1440px.
- **Headline** (700, 2.8→5.4rem, lh 1.2–1.3): section titles and page headers.
- **Title** (600, 1.8–2.2rem, lh 1.2): card titles, sub-section heading.
- **Body** (400, 1.6→1.8rem at 992px, lh 1.5): default text; ~45–70ch measure is fine on cards, aim for 65–75ch on long readable passages.
- **Label** (600, 1.4rem, +0.5px tracking): micro-labels, nav meta, uppercase badges elsewhere.

Weights available: 400 / 600 / 700. Only these. The base font size is 62.5% (1rem = 10px) across all page stylesheets.

### Named Rules
**The One-Family Rule.** Montserrat everywhere — public pages, the admin dashboard, modals. Never introduce a second display face or a mono face; emphasis comes from weight, not font switching.

## Layout

Mobile-first, with one container rhythm shared by every page. `.container` is full-width with 16px inline padding, then sits at fixed max-widths — 580px base, 720px at 768px, 950px at 992px, 1460px at 1440px — always centered. Sections pad 60px below on small screens and 80px once ≥768px.

Room discovery grids use `repeat(auto-fit, minmax(280px, 1fr))` with a 16px gutter, so cards reflow to fill any width rather than pinning to fixed column counts. The hero is a 12-column grid at ≥992px (content in `grid-column: 1 / 7`), and the story mosaic switches to a 12-column editorial layout with asymmetric column spans at ≥1440px. Density stays generous: 8px for tight icon gaps, 16–20px for card padding, 24–32px for section internals. Headings keep more space above than below (e.g. `.title-wrapper` margin-block-end 32–48px).

## Elevation & Depth

This system is **layered tonal with soft shadows**, never hard. Resting surfaces are flat panels on the neutral ramp — Cloud White pages, Cool Paper cards — and depth reads through four soft, offset shadow steps that appear on hover, focus, and overlay surfaces. No hard offset/blurless shadows anywhere.

### Shadow Vocabulary
- **shadow-1** (`0px 2px 4px rgba(0,0,0,0.2)`): resting elevation cue for small floating chrome — the mobile navbar popover, subtle lift.
- **shadow-2** (`0px 5px 10px rgba(0,0,0,0.05)`): the card rest state — a barely-there bed shadow.
- **shadow-3** (`0px 5px 10px rgba(0,0,0,0.2)`): elevated standalone chrome — icon buttons and badges that float on imagery.
- **shadow-4** (`0px 10px 20px rgba(0,0,0,0.1)`): raised surfaces — hovered/focused cards and the hero search bar. The modal uses 2-3x this strength (`0 25px 50px -12px rgba(0,0,0,0.25)`).

### Named Rules
**The Flat-By-Default Rule.** Surfaces rest flat (shadow-2 max). Shadows appear or deepen only in response to state — hover, focus-within, and overlay — never as a resting default on big surfaces.

## Shapes

A friendly, uniformly rounded form language: the radius scale is 8 / 12 / 16 / 32 / 1000px / 50%. Action buttons are pills (1000px); cards and popovers use 16px; inputs and fields 12px; large feature banners and modal bodies 32px; avatars and the play button are perfect circles (50%). Cards clip their imagery with `overflow: hidden` so photos always end in a soft corner. This is a system where every edge touches the palette — there are no sharp corners on interactive surfaces.

## Components

### Buttons
- **Shape:** pill (radius-full, 1000px), 48px height, centered content with a 12px gradient gap for trailing icon glyphs. `max-width: max-content` so buttons size to their label.
- **Primary (fill):** Campus Trust-Blue background, Cool Paper text, 24px inline padding. Hover/focus → Trust-Blue Hover + shadow-1; active/focus-visible → Trust-Blue Press. Transition 200ms on the quick easing curve.
- **Outline:** transparent fill, 2px inset Trust-Blue ring (`box-shadow: inset 0 0 0 2px`), Trust-Blue text. Hover/focus fills solid with Trust-Blue Hover text to paper; active → Trust-Blue Press. On the dark header it appears as a white-outlined pill that inverts to a white fill with Trust-Blue text.
- **Icon button:** 40px square, Cool Paper background, Coal glyph, 8px radius, shadow-3. Hover → Mist fill. Used for favorites and top-of-card actions.

### Chips
- **Style:** 32px tall, 16px inline padding, Campus Cyan background, shadow-3, 8px radius, semibold label. Center-aligned via grid.
- **State:** sits on top-left of room imagery at rest; the top-right action button is hidden at rest and fades in on card hover/focus-within (scale 0.8 → 1).

### Cards / Containers
- **Corner Style:** 16px radius, `overflow: hidden`.
- **Background:** Cool Paper (page itself is Cloud White, so cards read as a lifted panel).
- **Shadow Strategy:** rest at shadow-2; hover/focus-within lifts to shadow-4 (200ms).
- **Border:** none; internal top rule on the meta row uses a 1px Fog line.
- **Internal Padding:** 20px top/side, 24px bottom (`20px 20px 24px`).
- **Image behavior:** cover-cropped; on card hover the photo scales to 1.05 and rotates 2deg over 500ms smooth. Card titles rest Ink and shift Trust-Blue on hover.

### Inputs / Fields
- **Style:** a bordered-less field with a floating label: label pinned to the top edge, value area padded 40px top / 12px bottom inside a 76px-tall tap target. Radius 12px.
- **Focus:** field fill shifts to Mist with a 200ms transition; the enclosing search bar carries shadow-4 at rest.
- **Error / Disabled:** error text uses Status Red; disabled stays Stone with no shadow.

### Navigation
- **Public header:** transparent and fixed at 100px over the hero; on scroll it compresses to a 72px Midnight Navy bar (animate-in via slide_down, 500ms). Desktop links are Haze → white on hover/active, with the active link marked by a 4px white dot under its baseline. The right-side CTA is a white-outlined pill that inverts to a white fill.
- **Mobile:** a popover panel drops from the top-right — Cool Paper, 16px radius, shadow-1, entrance scale 0.4 → 1 over 200ms. Links toggle Trust-Blue on hover/active.
- **Admin:** a sticky Midnight Navy navbar with white 20px glyphs, 8px-radius link pills (white 10% fill on hover, white fill with navy text when active).

### Booking Modal (signature component)
A focused dialog with a blurred dim overlay (`rgba(15,23,42,0.65)` + 6px backdrop blur), a white body at 32px radius capped at 520px, a heavy `0 25px 50px -12px` shadow, and a slide-up entrance (translateY 20px → 0, scale 0.96 → 1, 250ms spring-ish cubic-bezier). The header band is the blue gradient (Trust-Blue → Ink Midnight) carrying the title, subtitle, and a small uppercase Campus Cyan ribbon; the close button (36px circle, white 15% fill, rotates 90° on hover) sits top-right.

## Do's and Don'ts

### Do:
- **Do** keep one primary action per view on Campus Trust-Blue, and let hover follow the blue ramp (Hover → Press).
- **Do** rest cards at shadow-2 and lift only to shadow-4 on hover/focus-within — the Flat-By-Default Rule.
- **Do** keep corners on the radius scale: pill buttons, 16px cards, 12px fields, 32px banners and modals.
- **Do** use Montserrat everywhere, public and admin, at weights 400 / 600 / 700 only.
- **Do** compose surfaces on the cool paper neutrals (Cloud White page, Cool Paper cards) so photos and blue accents stay the star.
- **Do** keep mid-tone text on the neutral ramp (Slate for descriptions, Stone for placeholders) — never pure gray.

### Don't:
- **Don't** add a second typeface or a mono "tech" face — the One-Family Rule.
- **Don't** run shadow-4 at rest on large surfaces; it belongs to hovered cards, the search bar, and overlays.
- **Don't** enlarge Campus Cyan beyond badges and rare signals — the Rarity Rule.
- **Don't** use gradient text or hard offset (blurless) shadows anywhere; depth is tonal and soft.
- **Don't** make primary action targets shorter than 48px or put them in corners where a thumb can't rest.
- **Don't** swap roles between Trust-Blue (action) and Midnight Navy (atmosphere) — the Two-Blue Rule.