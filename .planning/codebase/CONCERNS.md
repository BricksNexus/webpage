# Technical Concerns & Risks

_Last updated: 2026-06-14_

---

## P0 — Blocking / Security Risks

### 1. All API routes are fully unauthenticated and rate-limit-free

**Files:** `app/api/property/route.js`, `app/api/property/enrich/route.js`, `app/api/opportunity/analyze/route.js`, `app/api/feasibility/route.js`

Every POST endpoint is public with no authentication, API key, session check, or rate limiter. Any caller can:
- Hammer `/api/opportunity/analyze` to exhaust the `GOOGLE_API_KEY` Gemini quota (LangGraph pipeline fires a Gemini call per request).
- Hammer `/api/feasibility` to exhaust the `OPENROUTER_API_KEY` or `OPENAI_API_KEY` quota.
- Hammer `/api/property` or `/api/property/enrich` to exhaust `ATTOMDATA_API_KEY` credits and trigger paid AttomData billing.

The only input check is a 500-character address length cap in `app/api/opportunity/analyze/route.js` (line 29). No rate limiting exists anywhere in the codebase.

**Fix:** Add `lib/rate-limiter.js` (IP-based in-memory token bucket or edge middleware) before all `/api/` routes. For Vercel, use `@vercel/kv` or Upstash Redis. Minimum: 10 req/min per IP on AI-touching routes.

---

### 2. `e?.message` leaked directly to HTTP clients on `/api/property` and `/api/property/enrich`

**Files:** `app/api/property/route.js` line 49, `app/api/property/enrich/route.js` line 65, `app/api/feasibility/route.js` line 153

```js
{ error: e?.message || "Property lookup failed." }
```

`fetchPropertyIntel` (and the geocode/PLUTO/AttomData chain) can throw errors whose `.message` values may contain internal URLs, partial API keys embedded in request strings, or third-party service error payloads. `/api/opportunity/analyze/route.js` correctly suppresses this (line 44–49), but the other three routes do not.

**Fix:** Replace with a static fallback message and log `e` server-side only:
```js
console.error("[api/property] error:", e);
return NextResponse.json({ error: "Property lookup failed." }, { status: 500, headers: CORS_HEADERS });
```

---

### 3. CORS wildcard (`*`) on API routes that accept `Authorization` header

**File:** `lib/api-cors.js` lines 2–6

```js
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "Content-Type, Authorization",
```

`Authorization` is explicitly allowed from any origin. Combined with unauthenticated routes and the `max_tokens: 2400` per-call Gemini spend, a cross-origin attack page can silently exhaust API quotas. Wildcard CORS is appropriate for a fully public read-only API but not for write/compute-heavy endpoints that burn paid credits.

**Fix:** In production, restrict `Access-Control-Allow-Origin` to the actual frontend domain (e.g. `https://www.bricksnexus.com`). Use an environment variable: `process.env.CORS_ORIGIN || "*"`.

---

### 4. `.DS_Store` files committed to the repository

**Files found:** `lib/.DS_Store`, `app/.DS_Store`, `app/api/.DS_Store`

`.DS_Store` is not in `.gitignore` (only `node_modules`, `.next`, and `.env*` are excluded). These files leak macOS directory metadata (folder structure, icon positions) and bloat the repo. In some edge cases they can expose directory listings.

**Fix:** Add to `.gitignore`:
```
.DS_Store
**/.DS_Store
```
Then run `git rm --cached lib/.DS_Store app/.DS_Store app/api/.DS_Store`.

---

## P1 — High Priority Technical Debt

### 5. Duplicate API routes: `/api/property` and `/api/property/enrich` are near-identical

**Files:** `app/api/property/route.js`, `app/api/property/enrich/route.js`

Both routes call `fetchPropertyIntel` with the same logic and the same `metroOverride` validation. The only difference is that `/enrich` projects a narrower response shape (explicit field whitelist). They will diverge silently as the codebase evolves — any fix to one needs to be duplicated in the other.

**Fix:** Delete `app/api/property/route.js` (or make it a thin redirect to `/api/property/enrich`). One canonical enrichment endpoint is sufficient. Update `CODEBASE.md` and `API.md`.

---

### 6. Root-level stale copies of `lib/` files — diverged from canonical versions

**Root files:** `route.js`, `token-data.js`, `feasibility-prompt.js`, `parse-address.js`, `zoning-knowledge-base.js`, `zoning-consultant-prompt.js`

All six exist at the project root AND inside `lib/`. They are not identical:

- `zoning-consultant-prompt.js` (root, 59 lines) is an older version; `lib/homeowner-feasibility/zoning-consultant-prompt.js` has an expanded "warm, patient, plain-language" tone instruction and an additional conversation-style section.
- `route.js` (root, 45 lines) is an earlier draft of `app/api/property/route.js` — missing CORS headers, missing `OPTIONS` handler, has stale JSDoc.
- `token-data.js` (root) and `lib/token-data.js` appear identical but their existence in two locations is still a maintenance hazard.
- `feasibility-prompt.js` (root, 8 lines) and `parse-address.js` (root, 37 lines) are unclear which is canonical.

None of these root files are imported by anything in `app/` or `lib/` (confirmed via the import in `app/api/feasibility/route.js` pointing to `@/lib/homeowner-feasibility/zoning-consultant-prompt`). They are dead code at the root.

**Fix:** Delete all six root-level files. Canonical versions live in `lib/homeowner-feasibility/` and `lib/`.

---

### 7. Marketplace Phase 3 is completely unbuilt but referenced in the report UI

**Missing:** `app/api/marketplace/route.js`, `app/marketplace/page.jsx`, `data/marketplace.json`

The ROADMAP.md (Phase 3) lists a "Publish to Marketplace" button that saves to `data/marketplace.json` via `POST /api/marketplace`. The Phase 2 report page (`app/opportunity-report/page.jsx`) likely renders this button. Clicking it will 404 (no API route exists) or fail silently with no user feedback.

**Fix:** Either stub the route to return a `501 Not Implemented` with a clear message, or implement Phase 3 before exposing the button publicly.

---

### 8. `zoning-knowledge-base.js` is truncated to 3000 characters in the AI prompt

**File:** `lib/langgraph/property-pipeline.mjs` line 153

```js
${zoningKBString.slice(0, 3000)}
```

The knowledge base (`lib/homeowner-feasibility/zoning-knowledge-base.js`) is 119 lines. Slicing to 3000 chars may arbitrarily cut the JSON mid-key, producing malformed or incomplete context for non-NYC properties. There is no validation that the slice is valid JSON.

**Fix:** Either pass the full knowledge base (it is small enough), or slice at a safe boundary (last complete entry before char 3000), or parse and serialize only the relevant zone family.

---

### 9. LangGraph pipeline silently swallows AI failure and returns a zero-value fallback

**File:** `lib/langgraph/property-pipeline.mjs` lines 187–203 (`analyzeOpportunity` catch block)

When Gemini's structured output call fails, the pipeline returns:
```js
{ canBuildMore: false, additionalUnitsEstimate: 0, farUsed: 0, farAllowed: 0, ... summary: "AI analysis encountered an error." }
```

This reaches the UI as a successful `200 OK` response with `ok: true`. The caller (`app/api/opportunity/analyze/route.js`) has no way to distinguish a real zero-FAR property from a failed AI call. Users see a blank/zero opportunity assessment with no indication the AI failed.

**Fix:** Add an `analysisError: true` flag to the fallback object. Surface this as a visible warning in the report UI.

---

## P2 — Medium Priority

### 10. `post-opportunity-chatbot.js` uses static, hard-coded "analysis" — no real API call

**File:** `public/post-opportunity-chatbot.js` lines 17–27 (`ANALYSIS_TEMPLATE`)

The older chatbot widget in `public/` generates a generic template response based only on the user's stated city/county (e.g. "Austin, TX") with a 1.8-second fake delay (`setTimeout`, line 83). It does not call `/api/feasibility` or `/api/property`. This is a stub that ships as if it were functional AI.

It co-exists with the newer full-featured chatbot embedded in `post-opportunity.js` (lines 754–1569), which does call the real APIs. Two chatbot implementations are active — one fake, one real — with no clear ownership or deprecation path.

**Fix:** Either remove `post-opportunity-chatbot.js` entirely (the newer chatbot in `post-opportunity.js` supersedes it) or make it clearly a demo/offline fallback with explicit UI labeling.

---

### 11. All user data, messages, bids, and opportunities stored only in `localStorage`

**File:** `public/app-state.js` — entire module

The application's persistence layer is 100% `localStorage`: users, opportunities, drafts, messages, bid threads, and tokenization submissions are all read/written via `localStorage.setItem`/`getItem`. This means:
- Data is per-browser, per-device. No cross-device access.
- Clearing browser storage destroys all user data, published opportunities, and message history permanently.
- The "marketplace" (Phase 3) plans to use `data/marketplace.json` on the server, creating a hybrid model where some data is local-only and some is server-persisted — inconsistent and confusing for users.
- No data backup, no account recovery.

**Impact:** This is acceptable for a demo/prototype but must be replaced before any real users publish opportunities or exchange bids.

**Fix:** Phase 4 (not yet planned) — migrate to Supabase or a backend database. For now, document explicitly that this is a demo prototype with ephemeral storage.

---

### 12. `package.json` uses `"latest"` for all core dependencies — no version pinning

**File:** `package.json` lines 11–18

```json
"next": "latest",
"react": "latest",
"react-dom": "latest",
"lucide-react": "latest",
"react-hook-form": "latest"
```

All five production dependencies (and all three devDependencies) are unpinned. `npm install` on a fresh clone may produce a different dependency tree tomorrow than today, especially across Next.js major versions (14→15→App Router changes). The `package-lock.json` mitigates this for `npm ci` but any `npm install` regeneration will float.

**Fix:** Pin all dependencies to the versions currently in `package-lock.json`. Run `npm install --save-exact` or manually update `package.json`.

---

### 13. No input sanitization on `address` before it is embedded in third-party API URLs

**Files:** `lib/open-property/geocode.mjs`, `lib/open-property/cities/nyc.mjs`, `lib/open-property/attom.mjs`

The address string passes through `encodeURIComponent` in URL construction (standard), but there is no upstream sanitization for control characters, null bytes, or excessively long Unicode before it reaches the fetch calls. The 500-char limit in `/api/opportunity/analyze` is the only guard, and it is absent from `/api/property` and `/api/property/enrich`.

**Fix:** Add the same 500-char cap and newline-stripping (`replace(/[\r\n]/g, " ")`) that `/api/opportunity/analyze/route.js` already implements to the other two routes.

---

### 14. `buildAnalysisPrompt` in the LangGraph pipeline is NYC-centric

**File:** `lib/langgraph/property-pipeline.mjs` line 156

The AI prompt begins: `"You are a real estate development analyst specializing in NYC zoning..."` — regardless of whether the address is in Boston, Austin, or London. For non-NYC addresses (`zoningRules.source === "gemini_knowledge"` or `"boston_assessing"`), this framing misleads the model.

**Fix:** Make the system role conditional on `zoningRules.source`. Use a generic "US real estate" framing for non-NYC properties.

---

## P3 — Low Priority / Nice To Have

### 15. `applyIntelToForm` is defined twice in `post-opportunity.js`

**File:** `public/post-opportunity.js` lines 1193–1246

`applyInlineToForm` (the actual implementation) is defined at line 1193. A second function `applyIntelToForm` (line 1245) contains only `applyInlineToForm()` — it is a one-line wrapper that does nothing extra and is never called externally. Dead wrapper function.

**Fix:** Delete `applyIntelToForm` (lines 1245–1247). All call sites already use `applyInlineToForm`.

---

### 16. `next.config.mjs` redirect uses `permanent: false` for the `/about.html` migration

**File:** `next.config.mjs` line 7

The `about.html → /about` redirect is marked `permanent: false` (302). If this is a permanent migration from a static site, it should be `permanent: true` (301) to benefit from browser and CDN caching and to update SEO signals.

**Fix:** Change to `permanent: true` once the old `/about.html` URL is confirmed decommissioned.

---

### 17. `createId` in `app-state.js` uses `Date.now() + Math.random()` — not collision-safe

**File:** `public/app-state.js` line 33

```js
return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
```

This produces IDs like `thread-1718395200000-ab4f2c`. In a single-device localStorage context collisions are extremely unlikely but not impossible if records are created in the same millisecond. Not cryptographically random.

**Fix:** Use `crypto.randomUUID()` (available in all modern browsers and Node 14+).

---

## Architecture Risks

### A. Dual-route property enrichment creates ambiguity about the canonical endpoint

`/api/property` and `/api/property/enrich` both call `fetchPropertyIntel` and return property data. They return different response shapes. The `post-opportunity-chatbot.js` calls `/api/property` (line 1287). The LangGraph pipeline calls `fetchPropertyIntel` directly (bypassing both). `CLAUDE.md` says the entry point is `lib/open-property/fetch-property-intel.mjs` but doesn't clarify which HTTP route is preferred. New code has a 50/50 chance of hitting the wrong endpoint.

### B. LangGraph pipeline is a module-level singleton compiled at import time

**File:** `lib/langgraph/property-pipeline.mjs` line 274

```js
export const propertyPipeline = workflow.compile();
```

The compiled graph is a module-level singleton. In Next.js App Router (edge runtime or Node serverless), module state may be shared across concurrent requests. LangGraph's `StateGraph` is designed to be invoked concurrently, but any accidental mutable shared state added to the graph in future would silently cause cross-request contamination.

### C. No server-side persistence: Phase 3 marketplace plans a `data/marketplace.json` file

The roadmap calls for `data/marketplace.json` as the marketplace store. On Vercel (serverless/edge), the filesystem is read-only except in `/tmp`, and `/tmp` is ephemeral per-instance. `data/marketplace.json` writes will silently succeed locally but data will be lost on every Vercel cold start or instance replacement.

**Fix required before Phase 3:** Use a database (Supabase, PlanetScale, Upstash Redis, or Vercel KV) for marketplace storage. Do not use JSON file writes on Vercel.

---

## Dead Code / Orphaned Files

| File | Status | Canonical Location |
|------|--------|-------------------|
| `route.js` (root) | Stale older draft of `/api/property` route — missing CORS, missing `OPTIONS` | `app/api/property/route.js` |
| `zoning-consultant-prompt.js` (root) | Older version — diverged from canonical | `lib/homeowner-feasibility/zoning-consultant-prompt.js` |
| `zoning-knowledge-base.js` (root) | Duplicate — content matches `lib/` version | `lib/homeowner-feasibility/zoning-knowledge-base.js` |
| `feasibility-prompt.js` (root) | Duplicate or orphan | `lib/homeowner-feasibility/feasibility-prompt.js` |
| `parse-address.js` (root) | Duplicate or orphan | `lib/homeowner-feasibility/parse-address.js` |
| `token-data.js` (root) | Duplicate — appears identical | `lib/token-data.js` |
| `public/post-opportunity-chatbot.js` | Superseded by inline chatbot in `post-opportunity.js` — returns fake static responses | N/A |
| `lib/.DS_Store`, `app/.DS_Store`, `app/api/.DS_Store` | macOS metadata — should never be committed | N/A |

None of the six root-level `.js` files are imported by any file in `app/`, `lib/`, or `components/`. Safe to delete.

---

## Missing Infrastructure

| Missing Item | Impact | Needed Before |
|---|---|---|
| Rate limiting on all `/api/` routes | API key exhaustion / abuse | Any public launch |
| Auth middleware (even a simple shared secret) on AI routes | Unlimited free Gemini/OpenRouter spend by anyone | Any public launch |
| `app/api/marketplace/route.js` | "Publish to Marketplace" button is broken | Phase 3 |
| `data/marketplace.json` (or replacement DB) | Phase 3 storage has no target | Phase 3 |
| `app/marketplace/page.jsx` | No marketplace listing page | Phase 3 |
| Test suite (zero test files found) | Any refactor is unverifiable | Before any significant refactor |
| Error monitoring (Sentry, Axiom, etc.) | No visibility into production AI failures | Any public launch |
| `GEMINI_MODEL` env var documented as required | Missing from `.env.example` — defaults to `gemini-2.5-flash` silently | Now |

---

## Dependency Risks

| Package | Risk | Notes |
|---|---|---|
| `next: "latest"` | Major version float — Next.js 15 introduced breaking App Router changes | Pin to current installed version from `package-lock.json` |
| `react: "latest"` / `react-dom: "latest"` | React 19 RC changes — hooks behavior differences | Pin to `18.x` until explicitly upgrading |
| `@langchain/langgraph: "^1.4.2"` | LangGraph JS API changed significantly between 0.x and 1.x; `^` allows minor bumps that may break `Annotation.Root` signature | Accept as-is but monitor changelogs |
| `@langchain/google-genai: "^2.1.31"` | Gemini model name deprecations (e.g. `gemini-2.5-flash` → future names) will silently fail | Pin and test on upgrades |
| `lucide-react: "latest"` | Icon names change between major versions — components using removed icons will throw at runtime | Pin to current version |
