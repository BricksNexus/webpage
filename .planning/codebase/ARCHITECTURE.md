# Architecture

_Last updated: 2026-06-14_

## System Overview

BricksNexus is a real estate intelligence and marketplace platform. Its core feature: a user submits a US property address, the system enriches it with public data (Census geocoder, NYC PLUTO, AttomData) and runs a 4-node LangGraph AI pipeline (Gemini 2.5 Flash) to produce a structured **Property Opportunity Report** showing owner, block/lot, zoning, FAR analysis, and development opportunity assessment. Reports can be published to a marketplace for discovery by developers and contractors.

The platform has two product tracks running in parallel:
1. **Property Intelligence** (new, active): address → enrichment → AI pipeline → opportunity report → marketplace
2. **Legacy Marketplace + Tokenization** (pre-existing): static HTML B2B marketplace, opportunity builder, tokenization submission form

## Dual-Surface Architecture

The project runs two co-resident surfaces from a single `npm run dev` process:

**Surface 1 — Next.js App Router (`app/`)**
- Handles React pages: `/about`, `/tokenization`, `/homeowner-feasibility`, `/opportunity-report`
- Provides all API routes under `app/api/`
- `/` redirects to `/index.html` (the static marketplace) to unify both surfaces under one dev server

**Surface 2 — Static HTML (`public/`)**
- Pre-existing marketplace and user-flow pages (index, dashboard, login, signup, profile, post-opportunity, tokenization, etc.)
- Served directly by Next.js static file serving from `public/`
- Uses its own `app-state.js` auth system (localStorage-based, no server session)
- The static pages call Next.js API routes for property enrichment and feasibility (with configurable `BRICKSNEXUS_API_BASE` for cross-origin deployment)
- Has its own CSS files (`marketplace.css`, `dashboard.css`, etc.) independent of Tailwind

Both surfaces share the same API routes. The static surface can run standalone on GitHub Pages or a CDN; when it does, it points to a separately deployed Next.js app for API calls.

## Next.js App Layer

**Framework:** Next.js App Router (plain JSX, no TypeScript)

**Root layout** (`app/layout.jsx`):
- Wraps all pages in `<SiteChrome>` (sticky global nav) and imports `globals.css`
- Metadata: title "BricksNexus", standard description

**Pages:**

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.jsx` | Redirects to `/index.html` (static marketplace) |
| `/about` | `app/about/page.jsx` | Static marketing page — mission, pillars, founder bio |
| `/tokenization` | `app/tokenization/page.jsx` | Wraps `TokenizationOpportunityForm` |
| `/homeowner-feasibility` | `app/homeowner-feasibility/page.jsx` | Wraps `FeasibilityChat`; uses `/api/property` + `/api/feasibility` |
| `/opportunity-report` | `app/opportunity-report/page.jsx` | Core product page — address input → LangGraph pipeline → report display |

**Global nav** (`components/site/SiteChrome.jsx`):
- Client component; active-link detection via `usePathname`
- Links: Marketplace (`/`), About, Tokenization, Feasibility, Opportunity Report, Login (`/login.html`)
- Dark mode variant on `/about` (slate-950 background)

## AI Pipeline Layer

**Entry point:** `POST /api/opportunity/analyze` → invokes `lib/langgraph/property-pipeline.mjs`

**LangGraph pipeline** — linear 4-node `StateGraph`:

```
START
  └─▶ enrich_property        # Node 1: calls fetchPropertyIntel() directly (no HTTP)
        └─▶ fetch_zoning_rules   # Node 2: routes to nyc_pluto / boston_assessing / gemini_knowledge
              └─▶ analyze_opportunity  # Node 3: Gemini structured output (OpportunityAssessment JSON schema)
                    └─▶ format_report       # Node 4: merges all state → flat report object for UI
                          └─▶ END
```

**State schema** (`PipelineState` via `Annotation.Root`):
- `address` — input string
- `property` — output of `fetchPropertyIntel()`
- `zoningRules` — routed zoning data (source: `nyc_pluto` | `boston_assessing` | `gemini_knowledge`)
- `aiAssessment` — structured Gemini output (FAR used/allowed/remaining, canBuildMore, canAddFloors, opportunities[], summary)
- `report` — final flat object consumed by React UI

**Node 1 — enrich_property:**
- Calls `lib/open-property/fetch-property-intel.mjs` directly (not via HTTP) to avoid circular dependency
- Returns `{ property }` or error stub

**Node 2 — fetch_zoning_rules:**
- Three-tier routing: NYC PLUTO (live FAR data from `localRecords.nyc.pluto`) → Boston assessing → Gemini knowledge (generic US zoning)
- Returns `{ zoningRules }` with `source` field indicating which tier was used

**Node 3 — analyze_opportunity:**
- Instantiates `ChatGoogleGenerativeAI` with `process.env.GEMINI_MODEL` (default `gemini-2.5-flash`)
- Uses `model.withStructuredOutput(opportunitySchema)` for guaranteed JSON shape
- Prompt includes property data + zoning rules + first 3000 chars of zoning knowledge base
- Falls back to a zeroed-out assessment stub on error (pipeline never throws)

**Node 4 — format_report:**
- Merges `property` (PLUTO, AttomData, Boston), `zoningRules`, and `aiAssessment` into a single flat object
- Fields: address, borough, block, lot, ownerName, buildingClass, taxClass, numBuildings, yearBuilt, numFloors, totalArea, totalUnits, residentialArea, residentialUnits, commercialArea, commercialUnits, buildingStyle, buildingFrontage, buildingDepth, constructionType, landFrontage, landDepth, lotAreaSqFt, zoningDistrict, aiAssessment, dataSource, fetchedAt, limitations[], dataQuality

**Property data stack** (`lib/open-property/`):
- `fetch-property-intel.mjs` — unified entry point; orchestrates all sub-fetchers
- `geocode.mjs` — Census Geocoder (address validation + lat/lng)
- `osm-overpass.mjs` — OpenStreetMap Overpass API (building types, landuse)
- `census-geographies.mjs` — Census geographic context (county, incorporated place)
- `attom.mjs` — AttomData `/property/basicprofile` (owner name, block/lot, year built, stories)
- `cities/nyc.mjs` — NYC PLUTO via Socrata API (zoning district, FAR, lot area, building class, units)
- `cities/boston.mjs` — Boston Assessing connector

**Feasibility LLM** (`lib/llm-chat.js`):
- Separate from the LangGraph pipeline; used by `/api/feasibility` (homeowner ADU chat)
- Provider routing: OpenRouter first (`OPENROUTER_API_KEY`) → OpenAI fallback (`OPENAI_API_KEY`)
- Default model: `openrouter/free`; override with `OPENROUTER_MODEL`

## API Routes

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/opportunity/analyze` | `app/api/opportunity/analyze/route.js` | Invokes LangGraph 4-node pipeline; returns `{ report }` |
| `POST /api/property/enrich` | `app/api/property/enrich/route.js` | Calls `fetchPropertyIntel()` directly; returns enriched property data |
| `POST /api/property` | `app/api/property/route.js` | Alias used by `FeasibilityChat` for parcel-style field lookup |
| `POST /api/feasibility` | `app/api/feasibility/route.js` | Sends property + chat history to OpenRouter/OpenAI; returns `{ feasibilitySummary, disclaimer }` |

All routes use `CORS_HEADERS` from `lib/api-cors.js` (`Access-Control-Allow-Origin: *`) to support cross-origin calls from the static HTML surface.

**Phase 3 (not yet built):**
- `POST /api/marketplace` — save opportunity to `data/marketplace.json`
- `GET /api/marketplace` — return all saved opportunities
- `app/marketplace/page.jsx` — listing page

## Static HTML Layer (`public/`)

Pre-existing B2B marketplace built as a standalone static app. All interaction is client-side via `app-state.js` (localStorage auth). Calls Next.js API routes for property/feasibility data using a configurable `BRICKSNEXUS_API_BASE`.

| File | Purpose |
|------|---------|
| `index.html` | Main marketplace — opportunity listings |
| `landing.html` | Marketing landing page |
| `about.html` | Static about page (parallel to `/about` Next.js page) |
| `dashboard.html` | User dashboard (my opportunities, profile) |
| `login.html` | Login form (localStorage auth) |
| `signup.html` | Registration (role selection: individual / company) |
| `onboarding-role.html` | Post-signup role configuration |
| `profile.html` | Public user profile |
| `post-opportunity.html` | 6-step opportunity builder (Type → Details → Needs → Chronogram → Financing → Documents) |
| `post-service.html` | Service posting form |
| `post-tokenization.html` | Tokenization submission (static version) |
| `marketplace.html` | Marketplace listing view |
| `open-to-work.html` | Professional availability listing |
| `open-to-work-portfolio.html` | Portfolio view |
| `tokenization.html` | Static tokenization page |

**Associated JS files in `public/`:**
- `post-opportunity.js` — 6-step form controller; scope varies by property type (land/house/apartment/building/office)
- `post-opportunity-chatbot.js` — embedded chatbot on post-opportunity page; asks if user owns home, collects location, returns ADU/development opportunity suggestions; scripted conversation (no real LLM call for static suggestions, uses templated responses)
- `app-state.js` — shared auth/user state (localStorage)

## Data Flow

### Primary Flow: Property Opportunity Report

```
1. User enters address in /opportunity-report
   └─▶ app/opportunity-report/page.jsx (client component, useSearchParams)

2. POST /api/opportunity/analyze  { address }
   └─▶ app/api/opportunity/analyze/route.js

3. propertyPipeline.invoke({ address })
   └─▶ lib/langgraph/property-pipeline.mjs

4. Node 1 — enrich_property
   └─▶ lib/open-property/fetch-property-intel.mjs
         ├─▶ lib/open-property/geocode.mjs           (Census Geocoder)
         ├─▶ lib/open-property/osm-overpass.mjs      (OpenStreetMap)
         ├─▶ lib/open-property/census-geographies.mjs
         ├─▶ lib/open-property/attom.mjs             (AttomData API — ATTOMDATA_API_KEY)
         ├─▶ lib/open-property/cities/nyc.mjs        (NYC PLUTO — Socrata public)
         └─▶ lib/open-property/cities/boston.mjs     (Boston Assessing)

5. Node 2 — fetch_zoning_rules
   └─▶ Routes based on detected city: nyc_pluto | boston_assessing | gemini_knowledge

6. Node 3 — analyze_opportunity
   └─▶ @langchain/google-genai ChatGoogleGenerativeAI (GOOGLE_API_KEY, GEMINI_MODEL)
         └─▶ lib/homeowner-feasibility/zoning-knowledge-base.js (static context)

7. Node 4 — format_report
   └─▶ Returns flat { report } object

8. Response: { report } → page.jsx
   └─▶ components/property/ReportCard.jsx        (Property + Land info grid)
   └─▶ components/property/OpportunityAssessment.jsx  (FAR metrics, badges, summary, publish button)
```

### Homeowner Feasibility Flow

```
1. User enters address in /homeowner-feasibility
   └─▶ components/homeowner-feasibility/FeasibilityChat.jsx

2. POST /api/property  { address }
   └─▶ Returns parcel data → displayed as property intel summary in chat

3. POST /api/feasibility  { address, property, messages[] }
   └─▶ lib/llm-chat.js → OpenRouter (OPENROUTER_API_KEY) or OpenAI fallback
   └─▶ Returns { feasibilitySummary, disclaimer }
```

### Tokenization Flow

```
1. User fills 4-step form at /tokenization
   └─▶ components/tokenization/TokenizationOpportunityForm.jsx

2. Draft saved to localStorage ("bricksnexus_tokenization_draft")
3. On publish → saved to localStorage ("bricksnexus_tokenization_submissions")
   (No server persistence in current implementation)
```

## Key Design Decisions

**JSX only, no TypeScript.** Enforced project-wide. All files are `.js`, `.jsx`, or `.mjs`. Never introduce `.ts` or `.tsx`.

**LangGraph direct import, not HTTP self-call.** Node 1 (`enrich_property`) imports `fetchPropertyIntel` directly rather than calling `POST /api/property/enrich` via HTTP. This avoids circular dependency and port-binding brittleness in serverless environments.

**LangGraph error isolation.** Every node catches its own errors and returns a degraded-but-valid state. The pipeline never throws; the UI always receives a report object (possibly with empty fields).

**Gemini structured output.** `model.withStructuredOutput(opportunitySchema)` with a plain JSON Schema object (no TypeScript generics, no null union types) enforces the exact `OpportunityAssessment` shape the UI expects.

**CORS wildcard on all API routes.** `lib/api-cors.js` exports `CORS_HEADERS` with `Access-Control-Allow-Origin: *` so static HTML pages on a different origin (e.g., GitHub Pages) can call the Next.js API.

**No database — JSON file for marketplace (planned).** Phase 3 will write to `data/marketplace.json`. No ORM or database dependency for v1.

**Tokenization persistence is localStorage-only.** The `/tokenization` React page saves drafts and published submissions to `localStorage` only. There is no server-side storage for tokenization data.

**Dual about pages.** Both `app/about/page.jsx` and `public/about.html` exist. The Next.js version is canonical (linked from SiteChrome); the static version is for the standalone HTML deployment.

**`/` redirects to static marketplace.** `app/page.jsx` does `redirect("/index.html")` so a single `npm run dev` serves both the React app and the legacy static site, matching GitHub Pages deployment behavior.

**Secrets:** `ATTOMDATA_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL` in `.env.local`. `OPENROUTER_API_KEY` (or `ZONING_CONSULTANT_API_KEY` alias) and `OPENROUTER_MODEL` for feasibility chat.
