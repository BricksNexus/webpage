# CODEBASE.md — File Map

> Maintained by AI. Update whenever a file is created, deleted, or its purpose changes.
> Read this before creating any new file — check if something already does what you need.

---

## App Pages (`app/`)

| File | Route | Purpose |
|------|-------|---------|
| [`app/layout.jsx`](app/layout.jsx) | all routes | Root layout — wraps everything in `<SiteChrome>` |
| [`app/page.jsx`](app/page.jsx) | `/` | Homepage / landing |
| [`app/about/page.jsx`](app/about/page.jsx) | `/about` | About page |
| [`app/about/layout.jsx`](app/about/layout.jsx) | `/about` | About-specific layout wrapper |
| [`app/about/about.css`](app/about/about.css) | — | About page styles |
| [`app/globals.css`](app/globals.css) | — | Global Tailwind base styles |
| [`app/homeowner-feasibility/page.jsx`](app/homeowner-feasibility/page.jsx) | `/homeowner-feasibility` | AI feasibility chat for homeowners |
| [`app/opportunity-report/page.jsx`](app/opportunity-report/page.jsx) | `/opportunity-report` | Property Opportunity Report — address form + two-column report display. Reads `?address=` query param. |
| [`app/tokenization/page.jsx`](app/tokenization/page.jsx) | `/tokenization` | Token investment detail page |

---

## API Routes (`app/api/`)

> See [`API.md`](API.md) for full request/response shapes.

| File | Endpoint | Purpose |
|------|----------|---------|
| [`app/api/property/route.js`](app/api/property/route.js) | `GET /api/property` | Legacy property lookup |
| [`app/api/property/enrich/route.js`](app/api/property/enrich/route.js) | `POST /api/property/enrich` | Main enrichment route — geocode + PLUTO + AttomData |
| [`app/api/opportunity/analyze/route.js`](app/api/opportunity/analyze/route.js) | `POST /api/opportunity/analyze` | LangGraph pipeline trigger |
| [`app/api/feasibility/route.js`](app/api/feasibility/route.js) | `POST /api/feasibility` | Homeowner feasibility AI chat |

---

## Components (`components/`)

> See [`COMPONENTS.md`](COMPONENTS.md) for props and usage.

| File | Purpose |
|------|---------|
| [`components/site/SiteChrome.jsx`](components/site/SiteChrome.jsx) | Global nav + shell wrapper — used in `app/layout.jsx` |
| [`components/property/ReportCard.jsx`](components/property/ReportCard.jsx) | Two-column property info card (owner, address, zoning, use) |
| [`components/property/OpportunityAssessment.jsx`](components/property/OpportunityAssessment.jsx) | Structured AI analysis output display |
| [`components/homeowner-feasibility/FeasibilityChat.jsx`](components/homeowner-feasibility/FeasibilityChat.jsx) | Chat UI for homeowner AI assistant |
| [`components/tokenization/FundingProgressBar.jsx`](components/tokenization/FundingProgressBar.jsx) | Token funding progress bar |
| [`components/tokenization/InvestmentCalculator.jsx`](components/tokenization/InvestmentCalculator.jsx) | Investment return calculator |
| [`components/tokenization/PropertyGallery.jsx`](components/tokenization/PropertyGallery.jsx) | Image gallery for tokenized property |
| [`components/tokenization/TokenDetailTabs.jsx`](components/tokenization/TokenDetailTabs.jsx) | Tabbed detail view for token offering |
| [`components/tokenization/TokenizationOpportunityForm.jsx`](components/tokenization/TokenizationOpportunityForm.jsx) | Form to submit a tokenization opportunity |
| [`components/tokenization/TokenizationPreviewCard.jsx`](components/tokenization/TokenizationPreviewCard.jsx) | Preview card shown before publishing |
| [`components/tokenization/TokenPurchaseWidget.jsx`](components/tokenization/TokenPurchaseWidget.jsx) | Widget for purchasing tokens |

---

## Library (`lib/`)

| File | Exports | Purpose |
|------|---------|---------|
| [`lib/api-cors.js`](lib/api-cors.js) | `corsHeaders`, `handleCors()` | CORS headers — use in every API route |
| [`lib/llm-chat.js`](lib/llm-chat.js) | `llmChat(messages)` | All LLM calls go here (OpenRouter-compatible, uses Gemini) |
| [`lib/token-data.js`](lib/token-data.js) | token config | Static token offering data |
| [`lib/langgraph/property-pipeline.mjs`](lib/langgraph/property-pipeline.mjs) | `propertyPipeline.invoke(state)` | LangGraph 4-node graph: enrich → zoning → analyze → format |

### Open Property (`lib/open-property/`)

| File | Exports | Purpose |
|------|---------|---------|
| [`lib/open-property/fetch-property-intel.mjs`](lib/open-property/fetch-property-intel.mjs) | `fetchPropertyIntel(address, opts)` | **Main entry point** — orchestrates all data sources |
| [`lib/open-property/attom.mjs`](lib/open-property/attom.mjs) | `attomBasicProfile(address)` | AttomData API wrapper (owner, block/lot, assessed value) |
| [`lib/open-property/geocode.mjs`](lib/open-property/geocode.mjs) | `geocode(address)` | Census geocoder → lat/lon + FIPS |
| [`lib/open-property/osm-overpass.mjs`](lib/open-property/osm-overpass.mjs) | `osmOverpass(lat, lon)` | OSM Overpass for building tags |
| [`lib/open-property/census-geographies.mjs`](lib/open-property/census-geographies.mjs) | `censusGeos(lat, lon)` | Census Tiger geographies (place, county, state) |
| [`lib/open-property/cities/nyc.mjs`](lib/open-property/cities/nyc.mjs) | `nycFetchPlutoByBbl()`, `nycGeosearch()` | NYC PLUTO + geosearch connector |
| [`lib/open-property/cities/boston.mjs`](lib/open-property/cities/boston.mjs) | `bostonAssessing()` | Boston CKAN assessor connector |
| [`lib/open-property/README.md`](lib/open-property/README.md) | — | Explains coverage, limitations, how to add cities |

### Homeowner Feasibility (`lib/homeowner-feasibility/`)

| File | Exports | Purpose |
|------|---------|---------|
| [`lib/homeowner-feasibility/feasibility-prompt.js`](lib/homeowner-feasibility/feasibility-prompt.js) | `buildFeasibilityPrompt()` | System prompt for feasibility AI |
| [`lib/homeowner-feasibility/zoning-consultant-prompt.js`](lib/homeowner-feasibility/zoning-consultant-prompt.js) | `zoningConsultantPrompt()` | Zoning-specific consultant prompt |
| [`lib/homeowner-feasibility/zoning-knowledge-base.js`](lib/homeowner-feasibility/zoning-knowledge-base.js) | `zoningKB` | Zoning rules knowledge base |
| [`lib/homeowner-feasibility/parse-address.js`](lib/homeowner-feasibility/parse-address.js) | `parseAddress()` | Address string parser |

---

## Scripts (`scripts/`)

| File | Purpose |
|------|---------|
| [`scripts/fetch-zoning-by-address.mjs`](scripts/fetch-zoning-by-address.mjs) | CLI: `node scripts/fetch-zoning-by-address.mjs "123 Main St"` |

---

## Public Static Pages (`public/`)

> Legacy HTML/CSS/JS pages from pre-Next.js era. Do not edit these unless explicitly asked.

| File | Purpose |
|------|---------|
| `public/index.html` | Legacy landing |
| `public/dashboard.html` + `.js` + `.css` | Legacy dashboard |
| `public/marketplace.html` + `.js` + `.css` | Legacy marketplace |
| `public/post-opportunity.html` + `.js` + `.css` | Legacy post opportunity form |
| `public/post-service.html` + `.js` + `.css` | Legacy post service form |
| `public/post-tokenization.html` + `.js` + `.css` | Legacy tokenization posting |
| `public/profile.html` + `.js` + `.css` | Legacy profile |
| `public/tokenization.html` + `.js` + `.css` | Legacy token page |
| `public/login.html` | Legacy login |
| `public/signup.html` | Legacy signup |
| `public/landing.html` | Legacy landing |
| `public/about.html` | Legacy about |
| `public/post-opportunity-chatbot.js` | Chatbot widget for post-opportunity page |
| `public/app-state.js` | Legacy shared state |
| `public/mobile-base.css` | Legacy mobile base styles |
| `public/images/` | Shared image assets |

---

## Root-Level Legacy Files

> These are duplicates or originals that have been moved into `lib/` or `components/`. Do not edit — canonical versions are in the proper directories.

| File | Canonical location |
|------|--------------------|
| `FeasibilityChat.jsx` | `components/homeowner-feasibility/FeasibilityChat.jsx` |
| `FundingProgressBar.jsx` | `components/tokenization/FundingProgressBar.jsx` |
| `InvestmentCalculator.jsx` | `components/tokenization/InvestmentCalculator.jsx` |
| `PropertyGallery.jsx` | `components/tokenization/PropertyGallery.jsx` |
| `TokenDetailTabs.jsx` | `components/tokenization/TokenDetailTabs.jsx` |
| `TokenizationOpportunityForm.jsx` | `components/tokenization/TokenizationOpportunityForm.jsx` |
| `TokenizationPreviewCard.jsx` | `components/tokenization/TokenizationPreviewCard.jsx` |
| `TokenPurchaseWidget.jsx` | `components/tokenization/TokenPurchaseWidget.jsx` |
| `geocode.mjs` | `lib/open-property/geocode.mjs` |
| `nyc.mjs` | `lib/open-property/cities/nyc.mjs` |
| `boston.mjs` | `lib/open-property/cities/boston.mjs` |
| `osm-overpass.mjs` | `lib/open-property/osm-overpass.mjs` |
| `census-geographies.mjs` | `lib/open-property/census-geographies.mjs` |
| `fetch-property-intel.mjs` | `lib/open-property/fetch-property-intel.mjs` |
| `feasibility-prompt.js` | `lib/homeowner-feasibility/feasibility-prompt.js` |
| `parse-address.js` | `lib/homeowner-feasibility/parse-address.js` |
| `zoning-consultant-prompt.js` | `lib/homeowner-feasibility/zoning-consultant-prompt.js` |
| `zoning-knowledge-base.js` | `lib/homeowner-feasibility/zoning-knowledge-base.js` |
| `token-data.js` | `lib/token-data.js` |
| `route.js` | `app/api/property/route.js` (legacy copy) |
| `globals.css` | `app/globals.css` (legacy copy) |

---

## Config Files

| File | Purpose |
|------|---------|
| [`next.config.mjs`](next.config.mjs) | Next.js config |
| [`postcss.config.mjs`](postcss.config.mjs) | PostCSS / Tailwind config |
| [`jsconfig.json`](jsconfig.json) | JS path aliases |
| [`.env.local`](.env.local) | Secrets (never commit) — see `API.md` for keys |
| [`.env.example`](.env.example) | Public template for `.env.local` |
| [`.gitignore`](.gitignore) | Git ignore rules |
| [`.github/workflows/static.yml`](.github/workflows/static.yml) | CI/CD workflow |

---

## Phase 3 Files (not yet created)

When Phase 3 (Marketplace) is built, add these here:

| File | Purpose |
|------|---------|
| `app/marketplace/page.jsx` | Marketplace listing page |
| `components/property/OpportunityCard.jsx` | Marketplace card component |
| `app/api/marketplace/route.js` | GET + POST for marketplace |
| `data/marketplace.json` | JSON storage for published opportunities |
