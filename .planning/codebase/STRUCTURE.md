# File & Directory Structure

_Last updated: 2026-06-14_

## Directory Map

```
webpage/                              # Project root (run all commands from here)
├── app/                              # Next.js App Router
│   ├── layout.jsx                    # Root layout — SiteChrome + globals.css
│   ├── page.jsx                      # / — redirects to /index.html
│   ├── globals.css                   # Global CSS (Tailwind base + CSS vars)
│   ├── about/
│   │   ├── page.jsx                  # /about — marketing/founder page
│   │   └── about.css                 # Scoped CSS for about page
│   ├── homeowner-feasibility/
│   │   └── page.jsx                  # /homeowner-feasibility — FeasibilityChat wrapper
│   ├── opportunity-report/
│   │   └── page.jsx                  # /opportunity-report — core product page
│   ├── tokenization/
│   │   └── page.jsx                  # /tokenization — TokenizationOpportunityForm wrapper
│   └── api/
│       ├── feasibility/
│       │   └── route.js              # POST /api/feasibility — OpenRouter/OpenAI chat
│       ├── opportunity/
│       │   └── analyze/
│       │       └── route.js          # POST /api/opportunity/analyze — LangGraph pipeline
│       └── property/
│           ├── route.js              # POST /api/property — parcel lookup (FeasibilityChat)
│           └── enrich/
│               └── route.js          # POST /api/property/enrich — full enrichment
│
├── components/
│   ├── site/
│   │   └── SiteChrome.jsx            # Global sticky nav (client component)
│   ├── property/
│   │   ├── ReportCard.jsx            # Two-column Property + Land info grid
│   │   └── OpportunityAssessment.jsx # FAR metrics, badges, opportunities list, AI summary
│   ├── homeowner-feasibility/
│   │   └── FeasibilityChat.jsx       # ADU feasibility chat UI (client component)
│   └── tokenization/
│       ├── TokenizationOpportunityForm.jsx  # 4-step tokenization form (client component)
│       └── TokenizationPreviewCard.jsx      # Live preview sidebar card
│
├── lib/
│   ├── api-cors.js                   # CORS_HEADERS constant — used by all API routes
│   ├── llm-chat.js                   # LLM provider config (OpenRouter → OpenAI fallback)
│   ├── token-data.js                 # Static tokenization reference data
│   ├── langgraph/
│   │   └── property-pipeline.mjs    # LangGraph 4-node pipeline (enrich→zoning→analyze→format)
│   ├── homeowner-feasibility/
│   │   ├── feasibility-prompt.js     # System prompt for feasibility LLM
│   │   ├── zoning-consultant-prompt.js  # Zoning consultant persona prompt
│   │   ├── zoning-knowledge-base.js  # Static zoning knowledge (injected into Gemini prompt)
│   │   └── parse-address.js          # Address parsing utility
│   └── open-property/
│       ├── fetch-property-intel.mjs  # ENTRY POINT — orchestrates all data fetchers
│       ├── geocode.mjs               # Census Geocoder (address → lat/lng + normalized)
│       ├── osm-overpass.mjs          # OpenStreetMap Overpass API
│       ├── census-geographies.mjs    # Census county/place lookup
│       ├── attom.mjs                 # AttomData /property/basicprofile
│       ├── cities/
│       │   ├── nyc.mjs               # NYC PLUTO via Socrata (zoning, FAR, lot, units)
│       │   └── boston.mjs            # Boston Assessing connector
│       └── README.md                 # open-property module documentation
│
├── public/                           # Static files — served directly by Next.js
│   ├── index.html                    # Main marketplace (B2B listings)
│   ├── landing.html                  # Marketing landing page
│   ├── about.html                    # Static about page (parallel to /about)
│   ├── dashboard.html                # User dashboard (my opportunities)
│   ├── login.html                    # Login (localStorage auth)
│   ├── signup.html                   # Registration
│   ├── onboarding-role.html          # Post-signup role selection
│   ├── profile.html                  # Public user profile
│   ├── marketplace.html              # Marketplace listing view
│   ├── post-opportunity.html         # 6-step opportunity builder form
│   ├── post-service.html             # Service posting form
│   ├── post-tokenization.html        # Static tokenization submission
│   ├── open-to-work.html             # Professional availability listing
│   ├── open-to-work-portfolio.html   # Portfolio view
│   ├── tokenization.html             # Static tokenization page
│   ├── post-opportunity.js           # 6-step form controller (vanilla JS)
│   ├── post-opportunity-chatbot.js   # Embedded ADU suggestion chatbot (scripted)
│   ├── app-state.js                  # Shared localStorage auth/user state
│   ├── *.css                         # Static surface CSS (marketplace, dashboard, etc.)
│   └── images/                       # Logos, photos (BricksNexus_simple_logo.png, etc.)
│
├── scripts/
│   ├── fetch-zoning-by-address.mjs   # CLI: fetch zoning for an address (node scripts/...)
│   └── lib/                          # (empty or internal script utilities)
│
├── docs/                             # Project documentation
│
├── .planning/                        # GSD planning artifacts
│   ├── PROJECT.md                    # Requirements, decisions, context
│   ├── ROADMAP.md                    # Phase plan (3 phases, PROP-01..10)
│   ├── codebase/                     # Codebase maps (this directory)
│   ├── phases/                       # Per-phase plan documents
│   │   ├── 01-property-data-api-layer/
│   │   └── 02-langgraph-ai-pipeline-report-page/
│   └── research/                     # Research notes
│
├── .claude/                          # Claude/AI session artifacts
│   └── worktrees/
│
├── CLAUDE.md                         # AI navigator — read first; links to CODEBASE.md, API.md, etc.
├── CODEBASE.md                       # Per-file registry (what every file does)
├── API.md                            # API route reference + request/response shapes
├── COMPONENTS.md                     # Component registry + props
├── STATE.md                          # Build status, phase progress, open todos
├── package.json                      # Dependencies (Next.js, LangGraph, Tailwind, etc.)
├── next.config.mjs                   # Next.js config
├── tailwind.config.mjs               # Tailwind config
├── postcss.config.mjs                # PostCSS config
└── .env.local                        # Secrets (never commit)
```

## App Router Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.jsx` | Redirect to `/index.html` (static marketplace) |
| `/about` | `app/about/page.jsx` | Marketing page — mission, three pillars, founder bio |
| `/homeowner-feasibility` | `app/homeowner-feasibility/page.jsx` | ADU/additional-unit feasibility chat |
| `/opportunity-report` | `app/opportunity-report/page.jsx` | Address input → LangGraph pipeline → property report display |
| `/tokenization` | `app/tokenization/page.jsx` | 4-step tokenization opportunity submission form |

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `SiteChrome` | `components/site/SiteChrome.jsx` | Global sticky nav; active-link highlighting; dark variant on `/about` |
| `ReportCard` | `components/property/ReportCard.jsx` | Two-column grid: Property Information + Land Information from report object |
| `OpportunityAssessment` | `components/property/OpportunityAssessment.jsx` | FAR used/allowed/remaining metrics, canBuildMore/canAddFloors badges, opportunities list, AI narrative, Publish button |
| `FeasibilityChat` | `components/homeowner-feasibility/FeasibilityChat.jsx` | Chat UI; calls `/api/property` then `/api/feasibility`; supports follow-up questions |
| `TokenizationOpportunityForm` | `components/tokenization/TokenizationOpportunityForm.jsx` | 4-step form (Property DNA → Financial Engineering → Legal & Compliance → Media & Docs); `react-hook-form`; localStorage draft/publish |
| `TokenizationPreviewCard` | `components/tokenization/TokenizationPreviewCard.jsx` | Sticky live preview sidebar showing form values as marketplace card |

## API Routes

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/opportunity/analyze` | POST | `app/api/opportunity/analyze/route.js` | Run full LangGraph pipeline; body: `{ address }`; returns `{ report }` |
| `/api/property/enrich` | POST | `app/api/property/enrich/route.js` | Run `fetchPropertyIntel()` directly; body: `{ address }`; returns enriched property data |
| `/api/property` | POST | `app/api/property/route.js` | Parcel-style property lookup used by `FeasibilityChat`; body: `{ address }` |
| `/api/feasibility` | POST | `app/api/feasibility/route.js` | Send property + messages to OpenRouter/OpenAI; body: `{ address, property, messages[] }`; returns `{ feasibilitySummary, disclaimer }` |

All routes must import and spread `CORS_HEADERS` from `lib/api-cors.js`.

## Library Modules

| Module | File | Purpose |
|--------|------|---------|
| `fetchPropertyIntel` | `lib/open-property/fetch-property-intel.mjs` | Master entry point — orchestrates geocode, OSM, Census, AttomData, city connectors |
| `geocode` | `lib/open-property/geocode.mjs` | Census Geocoder — address validation + normalized output + lat/lng |
| `osm-overpass` | `lib/open-property/osm-overpass.mjs` | OpenStreetMap Overpass API — building types, landuse |
| `census-geographies` | `lib/open-property/census-geographies.mjs` | Census geographic context — county, incorporated place |
| `attom` | `lib/open-property/attom.mjs` | AttomData `/property/basicprofile` — owner name, block/lot, year built, stories |
| `nyc` | `lib/open-property/cities/nyc.mjs` | NYC PLUTO (Socrata `64uk-42ks`) — zoning, FAR, lot area, building class, units |
| `boston` | `lib/open-property/cities/boston.mjs` | Boston Assessing connector |
| `propertyPipeline` | `lib/langgraph/property-pipeline.mjs` | Compiled LangGraph StateGraph; call via `.invoke({ address })` |
| `getLlmChatConfig` | `lib/llm-chat.js` | Returns LLM provider config object (url, headers, model) — OpenRouter preferred |
| `CORS_HEADERS` | `lib/api-cors.js` | CORS header object — spread into every API route response |
| `zoning-knowledge-base` | `lib/homeowner-feasibility/zoning-knowledge-base.js` | Static zoning knowledge JSON — injected into Gemini analysis prompt |
| `feasibility-prompt` | `lib/homeowner-feasibility/feasibility-prompt.js` | System prompt for `/api/feasibility` LLM calls |
| `zoning-consultant-prompt` | `lib/homeowner-feasibility/zoning-consultant-prompt.js` | Zoning consultant persona prompt |
| `parse-address` | `lib/homeowner-feasibility/parse-address.js` | Address parsing utility |
| `token-data` | `lib/token-data.js` | Static reference data for tokenization features |

## Static Public Pages

| Page | File | Purpose |
|------|------|---------|
| Main Marketplace | `public/index.html` | B2B opportunity listings — primary static surface entry point |
| Landing | `public/landing.html` | Marketing landing (hero, account types, platform edge) |
| About (static) | `public/about.html` | Static version of about page for standalone deployment |
| Dashboard | `public/dashboard.html` | User dashboard — my opportunities, drafts, profile links; requires auth |
| Login | `public/login.html` | Login form — localStorage-based auth via `app-state.js` |
| Signup | `public/signup.html` | Registration with role selection |
| Onboarding | `public/onboarding-role.html` | Post-signup role configuration |
| Profile | `public/profile.html` | Public user profile page |
| Marketplace | `public/marketplace.html` | Marketplace listing view (alternate/filtered view) |
| Post Opportunity | `public/post-opportunity.html` | 6-step opportunity builder (Type→Details→Needs→Chronogram→Financing→Documents) |
| Post Service | `public/post-service.html` | Service posting form for professionals |
| Post Tokenization | `public/post-tokenization.html` | Static tokenization submission form |
| Open to Work | `public/open-to-work.html` | Professional availability listing |
| Open to Work Portfolio | `public/open-to-work-portfolio.html` | Portfolio/work samples view |
| Tokenization (static) | `public/tokenization.html` | Static tokenization overview page |

## Root-Level Context Files

These files are maintained by AI sessions and must be kept current after every code change:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI navigator — primary router; links to all context files; hard rules |
| `CODEBASE.md` | Per-file registry — every file, what it does, imports/exports |
| `API.md` | API route reference — request/response shapes, env vars, external APIs |
| `COMPONENTS.md` | Component registry — props, which page uses each component |
| `STATE.md` | Build status, phase progress, open todos, known issues |

**Update protocol:** After any file create/edit, update the matching context file before reporting done.

## Scripts & Utilities

| Script | File | Purpose |
|--------|------|---------|
| Zoning CLI | `scripts/fetch-zoning-by-address.mjs` | CLI tool: `node scripts/fetch-zoning-by-address.mjs` — fetch zoning data for an address from terminal |

## Where to Add New Code

**New App Router page:**
- File: `app/<route-name>/page.jsx`
- If it needs a nav link: add to `NAV` array in `components/site/SiteChrome.jsx`
- Update `COMPONENTS.md` and `CODEBASE.md`

**New React component:**
- File: `components/<subdirectory>/<ComponentName>.jsx` (never at root `components/` level)
- Client components that use hooks/events: add `"use client"` at top
- Update `COMPONENTS.md`

**New API route:**
- File: `app/api/<path>/route.js`
- Always import and use `CORS_HEADERS` from `lib/api-cors.js`
- Handle `OPTIONS` preflight method
- Update `API.md`

**New LLM call:**
- Must go through `lib/llm-chat.js` (OpenRouter/OpenAI) or `@langchain/google-genai` (Gemini/LangGraph)
- Do not call Gemini or OpenAI directly outside these modules

**New property data source:**
- Add connector to `lib/open-property/cities/<city>.mjs` or as a new file in `lib/open-property/`
- Wire into `lib/open-property/fetch-property-intel.mjs`

**New LangGraph pipeline node:**
- Add node function to `lib/langgraph/property-pipeline.mjs`
- Add field to `PipelineState` via `Annotation`
- Wire with `.addNode()` and `.addEdge()`
- Recompile with `workflow.compile()`

**Phase 3 Marketplace files (not yet created):**
- `app/marketplace/page.jsx` — listing page
- `components/property/OpportunityCard.jsx` — card component
- `app/api/marketplace/route.js` — GET + POST handler
- `data/marketplace.json` — flat JSON storage (created on first publish)
