# TEPI DESIGN SYSTEM & REDESIGN BLUEPRINT

This document defines the visual identity, technical constraints, and implementation roadmap for the Tepi redesign. It serves as the single source of truth for all design and development decisions.

## 1. Vision & Core Rules
Redesign the entire Tepi website into a premium, cohesive, production-ready experience while preserving all existing content, functionality, routes, and business logic.

### Strict Requirements
- **Preservation:** DO NOT remove any pages, routes, features, forms, or API integrations.
- **Backend:** DO NOT change backend logic or database schema.
- **Content:** DO NOT change text unless improving grammar.
- **Layout:** DO NOT simplify or reduce the complexity of the current features.
- **Compliance:** Maintain WCAG AA accessibility and Lighthouse Performance 95+.
- **Admin consistency:** TEPI admin must follow the same patterns as AZR admin (sidebar/top nav, layout, editor, settings flow).

## 2. Design Language
- **Style:** Glassmorphism, Anime Slice-of-Life, Apple VisionOS, macOS Tahoe, Linear.app, Raycast.
- **Atmosphere:** A peaceful summer morning near the beach (Makoto Shinkai, Kyoto Animation, Ghibli environment).
- **Vibe:** Calm, Elegant, Minimalist, Premium SaaS.
- **Priority:** **Brand Clarity > Visual Effects.** The atmosphere must enhance the product, never distract from it.

## 3. Visual Tokens

### Color Palette
- **Primary:** `#1570EF` (Deep Blue)
- **Secondary:** `#58C7FF` (Sky Blue)
- **Accent:** `#AEEBFF` (Light Cyan)
- **White:** `#FFFFFF`
- **Sand:** `#FFF7EA` (Warm Background)

### Glass System
- **Decorative Glass:** `rgba(255, 255, 255, 0.10)` (Hero, Floating Cards, Navbar)
- **Content Glass:** `rgba(10, 20, 40, 0.35)` or `rgba(15, 30, 60, 0.45)` (Forms, Tables, Dashboards)
- **Attributes:** 24-32px backdrop blur, 1px thin white borders, soft blue ambient glow, layered depth.

### Typography
- **Logo:** `Kaushan Script` (Elegant connected script)
- **Headings:** `Plus Jakarta Sans ExtraBold`
- **Body:** `Plus Jakarta Sans Medium`
- **Fluidity:** Use `clamp()` for all sizes to ensure natural scaling.

## 4. Responsive & Stability System (STRICT)

### Viewport Support
- **Range:** 320px (Android) up to 3840px (4K/Ultrawide).
- **Fluid Layout:** Mandatory use of `clamp()`, `min()`, `max()`, and CSS Grid/Flexbox.
- **Zero Overflow:** `overflow-x: hidden` on html/body. No horizontal scrolling ever.
- **Images/SVG:** `max-width: 100%`, `height: auto`.

### Layout Stability
- **CLS (Cumulative Layout Shift):** Target < 0.1.
- **Pre-allocation:** Reserve space for images/widgets before they load.
- **Flow:** Animations must never change document flow (use `transform` instead of `width`/`top`).

## 5. Motion System
Motion should feel calm, elegant, and subtle.

- **Easing:** `--ease-spring` (Consistent across all transitions).
- **Durations:**
  - Hover: 180ms - 220ms
  - Reveal: 400ms - 500ms
  - Floating: 6s - 10s
  - Clouds: 60s - 120s
  - Waves: 8s - 15s
  - Ripple: 300ms
- **Animation Budget:** Only animate `transform`, `opacity`, and `filter`.

## 6. Component Standards

### Blog Editor (React-Quill)
- Admin blog editor uses **React-Quill** (same as AZR portfolio).
- Dynamic import via `next/dynamic` with `ssr: false`.
- Toolbar: heading, bold, italic, underline, strike, ordered list, bullet list, blockquote, code-block, link, image upload.
- Image upload handler: compress → upload to **Media gallery (R2)** → inject URL.
- Stylesheet: `react-quill-new/dist/quill.snow.css`.

### Media Gallery
- Admin page for managing uploaded images.
- Features: upload (drag+drop / click), grid preview, copy image URL, delete.
- Renders images stored in R2 bucket.
- Used as source for blog images, page covers, OG images, favicon.

### Admin Pages
TEPI admin routes follow the same structural pattern as AZR:
- **Layout:** Uniform title bar + content card.
- **Back navigation:** Every page has a "← Kembali" button to `/admin`.
- **State handling:** Loading, empty, success, error states using the design system primitives.
- **Settings:** Sectioned cards (Site Info, Contact, Social Links) with save feedback.

### Icons (Lucide only)
- Single icon library throughout the project.
- Import only used icons (tree-shakeable).

## 7. Implementation Roadmap (Phased)

### Phase 1: Design Tokens
Overhaul `globals.css`. Define variables for colors, glass, radius, shadows, and motion. Setup `next/font` for Typography (Plus Jakarta Sans + Kaushan Script).

### Phase 2: OceanScene (The Atmosphere)
Hybrid Background: CSS Sky/Ocean gradients + SVG Clouds + Wave animations + 1 Slot for High-res Hero Image (`/public/hero-beach.webp`).

### Phase 3: Global Shell
Redesign Navbar, Footer, Layout Wrappers, and Hero Section.

### Phase 4: Primitives (Atomic Components)
Create reusable components following the design system:
- Buttons, Cards, Inputs, Modals, Dropdowns.
- Success, Error, Loading, and Empty states for every component.
- Icons: Lucide only.
- Blog editor: React-Quill integration (dynamic import).

### Phase 5: Routes Redesign
Apply the design system to all route groups:
- Public: Home, Login, Register, Pricing, Blog, Blog detail, Contact, Report
- Dashboard: Main, Invoices list, Invoice detail
- Admin: Review, Blog (CRUD with React-Quill), Users, Abuse, Activity, Payments, Settings

### Rule
Never redesign pages independently. Pages only consume the system from Phases 1–4.

## 8. Quality & Performance Budget
- **Lighthouse:** Perf ≥ 95, A11y = 100, Best Practices = 100, SEO = 100.
- **Metrics:** FCP < 1.8s, LCP < 2.5s, INP < 200ms.
- **Code:** No duplicated logic, no duplicated CSS, DRY components, strong typing (TS strict), ESLint clean.
- **Semantic:** Proper HTML5 tags (`<main>`, `<article>`, etc.) and Metadata API for SEO.
