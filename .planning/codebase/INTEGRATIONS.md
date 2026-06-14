# External Integrations

_Last updated: 2026-06-14_

## AI / LLM

### Google Gemini via LangChain (`@langchain/google-genai`)
- **Used in:** `lib/langgraph/property-pipeline.mjs`, node `analyze_opportunity`
- **SDK:** `ChatGoogleGenerativeAI` from `@langchain/google-genai` ^2.1.31
- **Model:** `gemini-2.5-flash` (default); override via `GEMINI_MODEL` env var
- **Auth:** `GOOGLE_API_KEY` env var passed directly to `ChatGoogleGenerativeAI({ apiKey })`
- **Usage pattern:** Structured output with JSON schema (`model.withStructuredOutput(opportunitySchema)`) — returns a typed `OpportunityAssessment` object with FAR calculations, unit estimates, and opportunity bullets
- **Temperature:** `0` (deterministic structured output)

### OpenRouter (primary) / OpenAI (fallback) via `lib/llm-chat.js`
- **Used in:** `app/api/feasibility/route.js` — zoning consultant chat
- **SDK:** Raw `fetch` to OpenAI-compatible chat completions endpoint
- **Config module:** `lib/llm-chat.js` exports `getLlmChatConfig()` — returns `{ url, headers, defaultModel, providerLabel }` or `null` if no keys set
- **OpenRouter:**
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Auth: `OPENROUTER_API_KEY` (or alias `ZONING_CONSULTANT_API_KEY`)
  - Default model: `openrouter/free`; override via `OPENROUTER_MODEL`
  - Required headers: `HTTP-Referer` (from `OPENROUTER_SITE_URL` / `VERCEL_URL`), `X-Title: BricksNexus`
- **OpenAI fallback:**
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Auth: `OPENAI_API_KEY`
  - Default model: `gpt-4o`; override via `OPENAI_MODEL`
- **Temperature:** `0.35`, `max_tokens: 2400`
- **Graceful degradation:** If no LLM key is configured, `/api/feasibility` returns a placeholder Markdown response instead of an error

### LangGraph Pipeline (`@langchain/langgraph`)
- **Version:** ^1.4.2
- **Used in:** `lib/langgraph/property-pipeline.mjs`
- **Pattern:** `StateGraph` with `Annotation.Root` state, compiled via `workflow.compile()`
- **Nodes (linear, no branching):**
  1. `enrich_property` — calls `fetchPropertyIntel()` directly (no HTTP self-call)
  2. `fetch_zoning_rules` — derives zoning from PLUTO / Boston / Gemini knowledge tier
  3. `analyze_opportunity` — calls Gemini with structured output schema
  4. `format_report` — merges all state into a flat report object for the UI
- **Entry:** `POST /api/opportunity/analyze` → `propertyPipeline.invoke({ address })`

---

## Property Data APIs

### AttomData
- **Used in:** `lib/open-property/attom.mjs`, called from `lib/open-property/fetch-property-intel.mjs`
- **Auth:** `ATTOMDATA_API_KEY` env var
- **Condition:** Only called when `isLikelyUnitedStates(geocode)` is true and key is set; skipped gracefully otherwise
- **Data returned:** `ownerName`, `assessedValue`, `yearBuilt`, `bedrooms`, `bathrooms`, `stories`, `buildingSqFt`, `block`, `lot`, `useOccupancy`, `propertyType`, `lotSizeSqFt`

### NYC PLUTO (Socrata / NYC Open Data)
- **Used in:** `lib/open-property/cities/nyc.mjs`, called from `fetchPropertyIntel()` when `metro === "nyc"`
- **Auth:** No key required (public Socrata endpoint); optional `NYC_SODA_APP_TOKEN` for higher rate limits
- **Dataset:** Configured via `NYC_PLUTO_SODA_DATASET_ID` env var (MapPLUTO dataset on `data.cityofnewyork.us`)
- **Also uses:** `NYC_GEOCLIENT_APP_ID` + `NYC_GEOCLIENT_APP_KEY` for NYC Geoclient API (address → BBL)
- **Data returned:** `zoningDistrict`, `residFar`, `commFar`, `lotAreaSqFt`, `totalBuildingArea`, `numFloors`, `block`, `lot`, `buildingClass`, `taxClass`, `residentialUnits`, `totalUnits`, `residentialArea`, `commercialArea`, `ownerName`, `yearBuiltPluto`, `buildingStyle`, `buildingFrontage`, `buildingDepth`, `constructionType`, `lotFrontage`, `lotDepth`, `numBuildings`
- **Zoning confidence:** `official_local_open_data` when PLUTO returns data

### Boston Property Assessment (CKAN)
- **Used in:** `lib/open-property/cities/boston.mjs`, called when `metro === "boston"`
- **Auth:** No key required; `BOSTON_PROPERTY_ASSESSMENT_RESOURCE_ID` configures the datastore resource
- **Source:** `data.boston.gov` CKAN datastore API
- **Data returned:** `zoningDistrict`, `landUseOrOccupancy`, `ownerOccupied`
- **Zoning confidence:** `official_local_open_data` when Boston data returns

### Census Geocoder
- **Used in:** `lib/open-property/census-geographies.mjs`, `lib/open-property/geocode.mjs`
- **Auth:** No API key required
- **Endpoint:** `geocode.census.gov`
- **Usage:** Two roles — (1) free US address geocoding fallback when no Mapbox/Google key, (2) jurisdiction lookup (place / county / state) for US coordinates
- **Condition:** Only called for US addresses (`isLikelyUnitedStates(geocode)` check)

### OSM Overpass API
- **Used in:** `lib/open-property/osm-overpass.mjs`
- **Auth:** No key required (public)
- **Default endpoint:** `https://overpass-api.de/api/interpreter`; override via `OSM_OVERPASS_URL`
- **Condition:** Runs whenever geocoding produced coordinates (worldwide)
- **Data returned:** `buildingTypes`, `landuseAndOpenSpace`, `zoningLikeTags` (crowdsourced), `amenities`
- **Zoning confidence:** `osm_tag_crowdsourced` (lowest tier, used only when no official source)

### OSM Nominatim (geocoder fallback)
- **Used in:** `lib/open-property/geocode.mjs`
- **Auth:** No key; requires descriptive `User-Agent` via `NOMINATIM_USER_AGENT` env var
- **Condition:** Fallback when neither Mapbox nor Google Maps geocoding keys are set and Census geocoder fails or address is non-US
- **Disable:** Set `DISABLE_NOMINATIM_GEOCODE=1`

### Mapbox Geocoding (optional premium)
- **Used in:** `lib/open-property/geocode.mjs`
- **Auth:** `MAPBOX_ACCESS_TOKEN` env var
- **Condition:** Used when token is present; provides city/region/postcode context fields
- **Geocoder tier label:** Used to set `geocoderTier` on geocode result

### Google Maps Geocoding (optional premium)
- **Used in:** `lib/open-property/geocode.mjs`
- **Auth:** `GOOGLE_MAPS_GEOCODING_API_KEY` env var
- **Condition:** Alternative to Mapbox when token is present

---

## Authentication / Auth

No authentication or identity provider is integrated. All API routes are unauthenticated. CORS headers are applied via `lib/api-cors.js` (`CORS_HEADERS` constant) on all route handlers — every route exports an `OPTIONS` handler returning `204`.

---

## Other Third-Party APIs

### Regrid (parcel data)
- `REGRID_API_KEY` referenced in `.env.example` but not yet wired into any source file — placeholder for future parcel data integration.

---

## Integration Architecture

All external API calls are **server-side only** — no third-party keys are exposed to the browser.

```
Browser / Client
    │
    ▼
Next.js API Routes (app/api/)
    ├── POST /api/property          → lib/open-property/fetch-property-intel.mjs
    ├── POST /api/property/enrich   → lib/open-property/fetch-property-intel.mjs  (alias, shaped response)
    ├── POST /api/feasibility       → lib/llm-chat.js → OpenRouter / OpenAI (fetch)
    └── POST /api/opportunity/analyze → lib/langgraph/property-pipeline.mjs
                                          ├── Node 1: fetch-property-intel.mjs
                                          │     ├── geocode.mjs       (Mapbox | Google | Census | Nominatim)
                                          │     ├── census-geographies.mjs  (Census Geocoder)
                                          │     ├── osm-overpass.mjs  (Overpass API)
                                          │     ├── cities/nyc.mjs    (Geoclient + PLUTO Socrata)
                                          │     ├── cities/boston.mjs (Boston CKAN)
                                          │     └── attom.mjs         (AttomData API)
                                          ├── Node 2: zoning tier logic (no external call)
                                          ├── Node 3: @langchain/google-genai → Gemini
                                          └── Node 4: format_report (no external call)
```

**Key architectural constraints:**
- The LangGraph pipeline calls `fetchPropertyIntel()` as a direct import (not via self-HTTP) to avoid circular dependency and port brittleness — noted explicitly in `property-pipeline.mjs`
- `lib/llm-chat.js` is the **only** place allowed to call OpenRouter/OpenAI directly (per `CLAUDE.md` hard rule)
- `lib/open-property/fetch-property-intel.mjs` is the **single entry point** for all property data fetching — no route handler calls individual data sources directly
- All routes use `lib/api-cors.js` for CORS — never inline headers
- Geocoding falls through a tier chain: Mapbox → Google Maps → Census (US) → Nominatim → parse-only demo
- Zoning data falls through a confidence chain: NYC PLUTO → Boston Assessing → OSM tags → Gemini general knowledge
