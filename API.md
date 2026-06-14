# API.md — Routes, Shapes & External Services

> Maintained by AI. Update whenever an API route is added/changed or an env var is added.

---

## Environment Variables

| Key | Where used | Notes |
|-----|-----------|-------|
| `ATTOMDATA_API_KEY` | `lib/open-property/attom.mjs` | AttomData property data API |
| `GOOGLE_API_KEY` | `lib/langgraph/property-pipeline.mjs` | Gemini AI via `@langchain/google-genai` |
| `GEMINI_MODEL` | `lib/llm-chat.js` | Model string e.g. `gemini-2.5-flash` |

No database. No auth. Secrets in `.env.local` only — never commit.

---

## Internal API Routes

### `POST /api/property/enrich`
File: [`app/api/property/enrich/route.js`](app/api/property/enrich/route.js)

**Request:**
```json
{ "address": "305 East 105 Street, New York, NY" }
```

**Response:**
```json
{
  "validatedAddress": "305 E 105TH ST, NEW YORK, NY 10029",
  "ownerName": "JOHN DOE",
  "blockLot": "1234-0056",
  "zoningDistrict": "R7-2",
  "useAndOccupancy": "A1",
  "assessedValue": 850000,
  "buildingClass": "A1",
  "numFloors": 4,
  "unitsTotal": 8,
  "lotArea": 2500,
  "grossSqFt": 6400,
  "yearBuilt": 1920,
  "far": 3.4,
  "ownerAddress": "123 OWNER ST NEW YORK NY",
  "discoverMore": { ... }
}
```

**Data sources called (in order):**
1. Census geocoder → lat/lon
2. NYC geosearch (free) → BBL
3. NYC PLUTO Socrata → zoning, building class, dimensions
4. AttomData `/property/basicprofile` → owner name, assessed value
5. OSM Overpass → building tags fallback

**Fallback chain:** If any source fails, returns `null` for that field — never throws.

---

### `POST /api/opportunity/analyze`
File: [`app/api/opportunity/analyze/route.js`](app/api/opportunity/analyze/route.js)

**Request:**
```json
{ "address": "305 East 105 Street, New York, NY" }
```

**What it does:** Calls `propertyPipeline.invoke({ address })` from `lib/langgraph/property-pipeline.mjs`

**Response:**
```json
{
  "propertyData": { ...enriched fields... },
  "zoningAnalysis": "string — zoning summary from node 2",
  "opportunityAssessment": "string — AI opportunity text from node 3",
  "formattedReport": { ...structured report object... }
}
```

**LangGraph nodes:**
1. `enrich_data` — calls `/api/property/enrich` internally
2. `analyze_zoning` — Gemini summarizes zoning rules and buildable area
3. `assess_opportunity` — Gemini generates 2-3 paragraph opportunity assessment
4. `format_report` — structures output for UI consumption

---

### `POST /api/feasibility`
File: [`app/api/feasibility/route.js`](app/api/feasibility/route.js)

**Request:**
```json
{ "messages": [...chat history...], "address": "optional" }
```

**Response:** Streamed or JSON AI response from Gemini via `lib/llm-chat.js`

Used by: `components/homeowner-feasibility/FeasibilityChat.jsx`

---

### `GET /api/property`
File: [`app/api/property/route.js`](app/api/property/route.js)

Legacy route. Kept for backward compatibility. Prefer `/api/property/enrich`.

---

## Phase 3 Routes (not yet built)

### `POST /api/marketplace`
Save a published opportunity to `data/marketplace.json`

**Request:**
```json
{ "address": "...", "report": { ...formattedReport... } }
```

### `GET /api/marketplace`
Return all saved opportunities from `data/marketplace.json`

---

## External APIs

### AttomData
- **Base URL:** `https://api.attomdata.com`
- **Auth:** `apikey` header = `ATTOMDATA_API_KEY`
- **Endpoints used:** `/propertyapi/v1.0.0/property/basicprofile`
- **Docs:** https://api.developer.attomdata.com/docs
- **Wrapper:** `lib/open-property/attom.mjs` → `attomBasicProfile(address)`
- **Failure mode:** Returns `emptyResult` object (all nulls) on any error — never throws

### Google Gemini
- **SDK:** `@langchain/google-genai`
- **Model:** value of `GEMINI_MODEL` env var (e.g. `gemini-2.5-flash`)
- **Used in:** `lib/langgraph/property-pipeline.mjs`, `lib/llm-chat.js`
- **For direct LLM calls:** always use `lib/llm-chat.js`, not the SDK directly

### NYC PLUTO (Socrata)
- **Dataset:** `64uk-42ks`
- **URL pattern:** `https://data.cityofnewyork.us/resource/64uk-42ks.json?bbl=<BBL>`
- **Auth:** None required (public)
- **Wrapper:** `lib/open-property/cities/nyc.mjs` → `nycFetchPlutoByBbl(bbl)`

### NYC Geosearch
- **URL:** `https://geosearch.planninglabs.nyc/v2/search`
- **Auth:** None (free public API)
- **Returns:** BBL in `properties.addendum.pad.bbl`
- **Wrapper:** `lib/open-property/cities/nyc.mjs` → `nycGeosearch(address)`

### Census Geocoder
- **URL:** `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress`
- **Auth:** None
- **Returns:** lat/lon + FIPS codes
- **Wrapper:** `lib/open-property/geocode.mjs`

### OSM Overpass
- **URL:** `https://overpass-api.de/api/interpreter`
- **Auth:** None
- **Returns:** building/landuse OSM tags — hints only, not authoritative
- **Wrapper:** `lib/open-property/osm-overpass.mjs`

---

## CORS

All API routes must include CORS headers. Use:
```js
import { corsHeaders, handleCors } from '@/lib/api-cors'
```
