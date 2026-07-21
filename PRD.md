# TEPI REDESIGN — PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Product:** tepi.my.id  
**Type:** Free Indonesian subdomain platform  
**Document status:** Ready for Phase 1 implementation  
**Related:** `DESIGN.md` (visual & technical design system)

---

## 1. Problem Statement

TEPI already works as a product (auth, dashboard, admin, payments, blog, subdomain flow), but the current UI does not feel like one cohesive premium product. Users land on pages that look inconsistent, mobile Android layouts risk overflow/CLS, and the brand does not immediately communicate:

> **Tepi = platform subdomain gratis Indonesia yang tenang, modern, dan premium.**

Without a redesign grounded in a strict design system, every new page risks becoming a different "template", increasing maintenance cost and weakening trust.

---

## 2. Goals

### Primary Goals
1. **One product identity** across all public, dashboard, and admin routes.
2. **Premium trust** — calm beach/anime atmosphere that supports (never distracts from) the product.
3. **Mobile-first excellence** — perfect from 320px Android to 3840px ultrawide, zero horizontal scroll.
4. **Production performance** — Lighthouse 95+ / CLS < 0.1 / INP < 200ms.
5. **Zero regression** — same routes, features, forms, APIs, and backend logic.
6. **Admin feature parity** — match AZR admin quality & completeness (editor, settings, users).

### Non-Goals
- New public features (docs, FAQ, changelog, status page) unless explicitly added.
- Backend/schema/payment logic changes.
- Content rewrite beyond grammar fixes.
- Custom SVG logo in Phase 1 (Kaushan Script first).
- Full dark theme ship in Phase 1 (theme tokens prepared only).

---

## 3. Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 95 |
| Accessibility | ≥ 100 |
| Best Practices | ≥ 100 |
| SEO | ≥ 100 |
| FCP | < 1.8s |
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Horizontal scroll | 0 at 320–3840px |
| Design consistency | 100% pages use shared tokens/components |
| Feature regression | 0 broken flows (login, register, dashboard, admin, pay, blog, contact, report) |

**Qualitative success:** A first-time visitor immediately understands TEPI is an Indonesian free subdomain platform and feels the calm beach brand on every page.

---

## 4. Users & Jobs-to-be-Done

| Persona | JTBD | Critical screens |
|---------|------|------------------|
| **Visitor** | Understand TEPI, trust it, register | Home, Pricing, Blog, Contact |
| **User** | Login, manage subdomains, invoices, renew | Login, Register, Dashboard, Invoices |
| **Admin** | Review apps, users, abuse, payments, content, settings | Full admin suite |
| **Reporter** | Report abuse | Report |

---

## 5. Scope

### In Scope
All existing routes/features:

**Public**
- Home, Login, Register, Pricing
- Blog list, Blog detail
- Contact, Report
- Error / empty / loading states on those flows

**Dashboard**
- Dashboard main
- Invoices list, Invoice detail

**Admin**
- Admin review (`/admin`)
- Admin Blog list + create/edit (using **React-Quill** editor — same as AZR; image upload → R2 via Media)
- Admin Media gallery (upload, list, copy URL, delete — image assets for blog/pages/OG/favicon)
- Admin Users (list + manage)
- Admin Abuse reports
- Admin Activity logs
- Admin Payments history
- Admin Settings (site info, contact, social links, hero image upload)
- **CRM** (single customer view — integrated in redesign Phase 5)
  - User profile: semua subdomain, payments, invoices, activity log, abuse reports, notifications
  - Timeline: interactions (register, claim subdomain, renew, payment, abuse report, note)
  - Tags/labels per user (internal CRM notes)
  - Segments filter (active, pending payment, expiring, churned)
  - Search: by email, username, subdomain name
- Admin appearance/flow follows AZR admin pattern

### Out of Scope (this PRD)
- New product modules not already shipped
- Copywriting campaign / marketing rewrite
- Backend Paywuz / D1 / auth algorithm changes
- Custom vector logo production (post-beta)

---

## 6. Functional Requirements

### FR-1 Preservation
- Keep all URLs/routes unchanged.
- Keep all forms and API integrations working.
- Keep session/auth, Turnstile, Resend, Paywuz, D1 flows intact.

### FR-2 Design System Compliance
- Every page must compose from shared components + design tokens only.
- No magic numbers (spacing, radius, blur, shadow, duration, color).
- No page-local visual language that diverges from the system.

### FR-3 Responsive System
- Support 320 → 3840px (including foldables, tablets, ultrawide).
- Fluid typography/spacing via `clamp()` / `min()` / `max()`.
- No horizontal overflow; images/SVG/video max-width 100%.
- Tables must reflow responsively (no side-clipping).

### FR-4 Layout Stability
- Reserve space for media and async UI.
- Animations must not change document flow.
- Prefer `transform` / `opacity` / `filter` only.

### FR-5 Atmosphere (OceanScene)
- Hybrid background: CSS sky/ocean + SVG clouds + waves + optional `/public/hero-beach.webp`.
- Fallback CSS scene if image missing (never blank).
- Background never harms readability.

### FR-6 Glass UI
- Decorative glass for hero/nav/floating cards.
- Content glass for forms/tables/docs/dashboard.
- AA contrast on all text over glass.

### FR-7 Motion
- Calm, subtle, 60fps target.
- Respect `prefers-reduced-motion`.
- Shared motion tokens (hover/reveal/float/cloud/wave/ripple).

### FR-8 Component States
Every interactive surface includes:
- Loading
- Empty
- Success
- Error  
No blank screens, no raw stack traces.

### FR-9 Accessibility
- WCAG AA contrast
- Keyboard navigation
- Visible focus ring
- Screen-reader friendly labels
- Semantic HTML hierarchy (one H1 per page)

### FR-10 SEO
- Metadata API (title/description)
- Open Graph + Twitter Card
- Canonical where applicable
- JSON-LD where useful
- Descriptive `alt` on images

### FR-11 Icons
- Lucide only (single library, no mix).

### FR-12 Theme Architecture
- Colors only via tokens.
- Components never hardcode hex values.
- Future themes (Dark/Sunset/Sakura/Aurora) switchable by token change only.

### FR-13 Blog Editor (React-Quill)
Editor blog admin pakai **React-Quill** (sama seperti AZR portfolio):
- Import `react-quill-new` + `quill.snow.css`
- Dynamic import untuk SSR (Next.js)
- Toolbar: heading, bold, italic, underline, strike, ordered list, bullet list, blockquote, code-block, link, image upload
- Image upload via handler → compress → upload ke R2 → inject URL
- Wajib: `ssr: false` via `next/dynamic`

### FR-14 Admin Flow (AZR-style)
Halaman admin TEPI harus mengikuti pattern yang sama dengan AZR:
- Sidebar navigasi (atau top bar untuk mobile)
- Page layout seragam: title bar + content card
- Quick back navigation ke `/admin`
- POST/PUT form dengan loading + success/error states

### FR-15 CRM — Customer View
Admin bisa klik user → single view yang menggabungkan semua data user:
- **Profile:** email, username, full_name, role, subdomain_limit, join date, last activity
- **Subdomains:** list semua subdomain (name, status, plan, expires_at)
- **Payments:** semua invoice & histori pembayaran
- **Activity Log:** timeline interaksi (register, claim, approve, reject, renew, abuse report, note)
- **Notifications:** semua notifikasi user
- **Tags/Labels:** internal CRM notes dari admin (disimpan di `site_settings` atau tabel baru `crm_user_tags`)
- **Segments:** badge (active / expiring / churned / pending)
- **Search:** filter user by email, username, subdomain name
- Filter sidebar: All / Active / Expiring (within 7 days) / Churned (expired > 30 days) / Pending Payment

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | CSS-first motion; lazy media; GPU-friendly transforms |
| Maintainability | DRY components, reusable hooks, no duplicated CSS |
| Typing | Strong TypeScript; avoid `any` unless unavoidable |
| Lint | ESLint clean on redesign surface |
| Tree-shaking | Import only used Lucide icons |
| Runtime | Compatible with Cloudflare Workers + OpenNext |
| Deps | No new heavy libraries; `react-quill-new` is the only new dep (proven in AZR) |

---

## 8. Brand Requirements

Every page must communicate:

> Tepi is a modern Indonesian free subdomain platform.

Visual identity must feel:
- Unique and memorable
- Calm and trustworthy
- Premium SaaS-grade
- Beach-morning atmosphere without fantasy character clutter

---

## 9. Phased Delivery

| Phase | Deliverable | Exit criteria |
|-------|-------------|---------------|
| **1** | Design tokens, typography, glass/motion/responsive utilities, theme architecture | Tokens documented & imported; no page redesign yet |
| **2** | OceanScene + hero image slot + reduced-motion support | Scene renders with/without image; no overflow |
| **3** | Navbar, Footer, Layout shell, Hero | Shell consistent on mobile/desktop |
| **4** | Primitives: Button, Card, Input, Modal, Dropdown, Toast, Skeleton, Empty | All states implemented; Lucide only |
| **5** | Apply system to all existing routes (public + dashboard + admin), **CRM single-customer view** | All success metrics pass; zero feature regression |

**Rule:** Never redesign pages independently. Pages only consume the system from Phases 1–4.

**Editor note:** Add `react-quill-new` dependency during Phase 4 or Phase 5 (before admin blog is redesigned).

---

## 10. Acceptance Criteria (Release Gate)

- [ ] All existing routes still work (smoke: login, register, dashboard, admin, payment create path, blog, contact, report)
- [ ] No horizontal scroll at 320, 375, 414, 768, 1024, 1440, 1920, 3840
- [ ] No CLS jumps on home/login/dashboard hero/media
- [ ] Tokens used for color/spacing/radius/shadow/motion (spot-check components)
- [ ] `prefers-reduced-motion` disables continuous ambient animations
- [ ] Admin still lands with admin access; user still lands dashboard
- [ ] Lighthouse targets met on Home + Login + Dashboard (prod or preview)
- [ ] DESIGN.md + this PRD remain source of truth
- [ ] Admin blog editor uses React-Quill (verified inserted/working)
- [ ] Admin settings page matches AZR pattern (save, success, error states)
- [ ] No new unused dependencies in `package.json`

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Atmosphere hurts readability | Content glass + overlays; AA checks |
| Animations tank mobile FPS | Motion budget; CSS-only ambient; reduced-motion |
| Full sweep breaks consistency | Phased delivery; component-first |
| Missing hero asset | Mandatory CSS/SVG fallback |
| Perf regression from blur | Limit glass layers; avoid animating blur heavily |
| Token drift / magic numbers | PR review against DESIGN.md; shared utilities only |
| React-Quill ESM/SSR issues | Dynamic import with `ssr: false` (proven in AZR) |

---

## 12. Dependencies

- Existing TEPI app on Cloudflare Workers + D1
- Next.js 15 + OpenNext
- Fonts: Plus Jakarta Sans + Kaushan Script (`next/font`)
- Icons: Lucide (verify in TEPI package.json; add if missing)
- Optional asset: `/public/hero-beach.webp`
- **New:** `react-quill-new` (package proven in AZR; import `react-quill-new/dist/quill.snow.css`)

---

## 13. Open Decisions (Resolved)

| Decision | Resolution |
|----------|------------|
| Background | Hybrid CSS/SVG + optional hero image |
| Delivery | Phased (tokens → scene → shell → primitives → pages) |
| Logo | Kaushan Script first; SVG later |
| Glass | Decorative + Content dual system |
| Icons | Lucide only |
| Theme | Token-based; future themes not shipped now |
| Blog editor | React-Quill (same as AZR) |
| Admin pattern | Follow AZR admin layout/flow |

---

## 14. Out-of-Band Notes for Engineering

- Do **not** start page redesign before Phase 1 tokens land.
- Preserve runtime secrets (`AUTH_SECRET`, etc.) behavior — redesign is frontend surface only.
- Keep `force-dynamic` / CF D1 async patterns already required for Workers.
- Prefer extending existing `components/ui/*` rather than inventing parallel libraries.
- `react-quill-new` is the version compatible with React 18/19; test after install.

---

## 15. Sign-off Checklist

| Role | Sign-off |
|------|----------|
| Product (owner) | Blueprint accepted as PRD |
| Design system | See `DESIGN.md` |
| Engineering | Phase 1 ready to implement |

**Status:** Approved for **Phase 1 — Design Tokens** when operator says **Gas**.
