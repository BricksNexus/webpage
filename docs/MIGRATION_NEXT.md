# BricksNexus Website → Next.js (unified app)

This document maps the **full repo** and the **phased plan** to run everything under Next.js while migrating HTML/JS pages to React.

## Current architecture (after Goal 1)

| Layer | Location | Role |
|--------|-----------|------|
| **Static legacy UI** | `public/` | HTML/CSS/vanilla JS + `images/`. Served at `/{file}` (e.g. `/index.html`, `/dashboard.html`). Same tree as before, only the folder changed. |
| **Next.js App Router** | `app/` | React pages: `/` (redirect), `/about`, `/tokenization`, `/homeowner-feasibility`, `app/api/*`. |
| **Shared React components** | `components/` | Tokenization form, feasibility chat, etc. |
| **Server / shared logic** | `lib/` | API helpers, open-property, homeowner-feasibility prompts, CORS. |
| **Scripts (Node)** | `scripts/` | e.g. `fetch-zoning-by-address.mjs` |

**Local dev:** `npm run dev` → marketplace at **`http://localhost:3000/`** (redirects to `/index.html`), APIs at **`/api/*`**, React routes as listed.

**Production (GitHub Pages):** workflow publishes **`public/`** only (static). **Next API routes are not on Pages** — use Vercel/similar or a separate API host for `/api/property` and `/api/feasibility` unless you proxy.

---

## Legacy page inventory (`public/*.html`)

| File | Scripts | Notes |
|------|---------|--------|
| `index.html` | `app-state.js` | Marketplace (main entry). |
| `marketplace.html` | — | Redirect to `index.html`. |
| `landing.html` | — | Marketing landing. |
| `login.html`, `signup.html`, `onboarding-role.html` | `app-state.js` | Auth flow (local demo). |
| `dashboard.html` | `app-state.js`, `dashboard.js` | User hub. |
| `profile.html` | `app-state.js`, `profile.js` | Public profile. |
| `post-opportunity.html` | `app-state.js`, `post-opportunity.js` | Large builder + explorer. |
| `post-service.html` | `app-state.js`, `post-service.js` | |
| `post-tokenization.html` | `app-state.js`, `post-tokenization.js` | Distinct from React `/tokenization`. |
| `tokenization.html` | `app-state.js`, `tokenization.js` | **Static** tokenization card/detail vs **React** `app/tokenization`. |
| `open-to-work.html`, `open-to-work-portfolio.html` | inline | |
| `about.html` | `about.css` | **Also** implemented as **`/about`** (Next). On `npm run dev`, `about.html` **redirects** to `/about` (see `next.config.mjs`). **GitHub Pages** still serves static `about.html` (no server redirect to React). |

### Duplicate / stray files at repo root (not in `public/`)

Legacy merge left some Node-oriented copies next to `lib/` (e.g. `feasibility-prompt.js`, `zoning-knowledge-base.js`, `route.js`). **Next uses `lib/` and `app/api/`**; these root files can be removed in a cleanup pass once confirmed unused.

---

## Goal 1 (done): Single dev server

1. Move static site into **`public/`** so Next serves it.
2. **`app/page.jsx`** redirects **`/` → `/index.html`** (marketplace home).
3. **GitHub Pages** artifact path = **`public/`** so `index.html` stays the site root.

---

## Goal 2 (in progress): Migrate page-by-page to Next/React

**Order (suggested)** — small / isolated first, heavy forms last:

1. ✅ **`/about`** — static marketing (first React migration).
2. `landing.html` → `app/landing` or `/` (decide product default).
3. Auth shells: `login`, `signup`, `onboarding-role` (shared `auth.css`).
4. `profile.html`, `dashboard.html` (shared `marketplace.css` + `profile.css` / `dashboard.css`).
5. `post-service.html`, `open-to-work*.html`.
6. `post-opportunity.html` + `post-opportunity.js` (largest).
7. Reconcile **`tokenization.html` / `tokenization.js`** vs **`app/tokenization`** (merge or redirect one way).

**Per page checklist**

- [ ] JSX page under `app/<segment>/page.jsx`.
- [ ] Styles: CSS module, scoped file, or Tailwind (avoid leaking global `body` rules).
- [ ] Replace `href="*.html"` with `Link href="/…"` or `/file.html` for unmigrated peers.
- [ ] `next.config` redirect from old `*.html` if URLs are bookmarked.
- [ ] Remove migrated `public/*.html` (+ unused `public/*.css` if inlined).

---

## References

- Env template: `.env.example`
- API: `app/api/property/route.js`, `app/api/feasibility/route.js`
