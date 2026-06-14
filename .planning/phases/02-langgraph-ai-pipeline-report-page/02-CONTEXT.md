# Phase 2: LangGraph AI Pipeline + Property Report Page — Context

**Gathered:** 2026-06-14
**Status:** Ready for planning
**Source:** discuss-phase (user conversation + spec document)

<domain>
## Phase Boundary

Build the LangGraph multi-agent pipeline that enriches property data from multiple sources, runs AI analysis via Gemini, and displays a structured Opportunity Report at `/opportunity-report`. The report is the core product — it compares what IS built against what ZONING ALLOWS and surfaces development opportunities.

**Not in this phase:** Marketplace (Phase 3), authentication, payments.

</domain>

<decisions>
## Implementation Decisions

### Report Content — Exact Fields Required

The report must display ALL fields from this specification exactly:

**Property Information section:**
- Address (formatted: "305 EAST 105 STREET - NEW YORK 10029")
- Borough (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
- Block number
- Lot number
- Property Owner (full legal name — "305 MK SECURE HOLDINGS, LLC")
- Type code + description (e.g., "C7 - WALK-UP APT. OVER SIX FAMILIES WITH STORES")
- Tax Class (1, 2, 3, 4)
- Number of Buildings
- Year Built
- Number of Stories
- Total Area (sq ft)
- Total Units
- Residential Area (sq ft)
- Residential Units
- Commercial Area (sq ft)
- Commercial Units
- Building Style (e.g., "WalkUp Apt")
- Building Frontage (ft)
- Building Depth (ft)
- Construction Type (e.g., "Masonry")

**Land Information section:**
- Land Frontage (ft)
- Land Depth (ft)
- Land Area (sq ft)
- Zoning district code (e.g., "R7A")

**AI Opportunity Assessment section (structured JSON output from LangGraph):**
- `canBuildMore` (boolean) — can the owner build additional units?
- `additionalUnitsEstimate` (number) — estimated units that can be added
- `canAddFloors` (boolean) — can floors be added?
- `conversionOpportunity` (string) — description of residential→commercial conversion possibility
- `summary` (string) — 2-3 paragraph narrative combining all findings
- Specific opportunity bullets (e.g., "Add 3 units (FAR allows)", "Convert ground floor to retail")

### Report Layout

Two-column card layout:
- **Left card:** Property Information (all fields above)
- **Right card:** Land Information + Zoning
- **Full-width panel below:** AI Opportunity Assessment (structured fields + narrative summary)
- **"Publish to Marketplace" button** at bottom of AI Assessment panel

### Entry Point

Address input form lives directly on `/opportunity-report` page:
- User arrives at `/opportunity-report`
- Types address into form, hits "Analyze"
- Report renders below (or replaces) the form
- URL updates to `/opportunity-report?address=...` so it's shareable

### URL Strategy

Query param: `/opportunity-report?address=305+East+105+Street+New+York+NY`
- Simple, no server-side storage needed
- Report re-generates on page load from the URL address
- Shareable link works out of the box

### LangGraph Pipeline Shape

**Linear 4-node graph** (chosen by user):

```
enrich_property → fetch_zoning_rules → analyze_opportunity → format_report
```

Node contracts:
1. **`enrich_property`** — calls `/api/property/enrich` (Phase 1 output), returns all property fields
2. **`fetch_zoning_rules`** — calls city-specific APIs to get zoning restrictions/permissions for the zoning district. For NYC: extend `nyc.mjs` to return FAR limits, max height, allowed uses, required parking. For other cities: use Gemini's built-in zoning knowledge + any available open data.
3. **`analyze_opportunity`** — Gemini AI compares property data against zoning rules, determines: can build more, floor additions, commercial conversion. Returns structured JSON.
4. **`format_report`** — Merges all node outputs into a single report object for the UI.

**LangGraph packages:** `@langchain/langgraph`, `@langchain/google-genai`
**Reference repo:** https://github.com/langchain-ai/deepagents.git — review for multi-agent patterns and state management conventions

### AI Output Format

Structured JSON (not free-text narrative). The AI returns:
```json
{
  "canBuildMore": true,
  "additionalUnitsEstimate": 3,
  "canAddFloors": false,
  "conversionOpportunity": "Ground floor commercial unit (1,166 sq ft) already exists; R7A allows limited commercial overlay — no expansion to additional floors.",
  "farUsed": 2.31,
  "farAllowed": 3.44,
  "farRemaining": 1.13,
  "heightLimitStories": 8,
  "currentStories": 5,
  "opportunities": [
    "Add approximately 3 residential units using remaining FAR (1.13)",
    "Potential to add 2-3 stories (within R7A height limit of ~75ft)"
  ],
  "summary": "This R7A-zoned property at 305 East 105th Street is operating below its maximum allowable density..."
}
```

### Data Sources — Comprehensive Per City

Get ALL available data, best effort:

**For NYC addresses (primary market):**
- `attom.mjs` — owner, block/lot, year built, units, stories, sq ft, property type, tax class
- `nyc.mjs` (PLUTO) — zoning district, FAR, building class, lot area, land frontage/depth
- Extend `nyc.mjs` to also fetch: construction type, building style, frontage/depth from PLUTO extended fields or DOB BIS where available
- NYC PLUTO field mapping: `BldgClass` → type code+description, `ZoneDist1` → zoning, `BldgArea`/`ResArea`/`ComArea` → area breakdowns, `NumFloors` → stories, `YearBuilt`

**For all other US cities:**
- `attom.mjs` — all available fields (universal)
- Gemini AI applies general US zoning principles from its training
- `census-geographies.mjs` — jurisdiction identification
- `osm-overpass.mjs` — physical building hints

### Zoning Analysis Scope

All US cities via a tiered approach:
1. **NYC** — full live zoning data from PLUTO + structured FAR/height calculations
2. **Boston** — existing `boston.mjs` connector extended where possible
3. **Other US cities** — Gemini uses its training knowledge of zoning codes + any AttomData fields available

The LangGraph `fetch_zoning_rules` node handles this tiering automatically based on city detected in Phase 1 geocoding output.

### API Route

`POST /api/opportunity/analyze` triggers the full LangGraph pipeline:
- Input: `{ address: string }`
- Calls `enrich_property` node (which calls `/api/property/enrich`)
- Runs full graph
- Returns complete report JSON

### No TypeScript

All files are `.mjs` (pipeline) or `.jsx` (UI). No `.ts` or `.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Pipeline (extend, don't rewrite)
- `lib/open-property/fetch-property-intel.mjs` — master enrichment function; Phase 2 calls it via `/api/property/enrich`
- `lib/open-property/attom.mjs` — AttomData client; all available fields documented in return type
- `lib/open-property/cities/nyc.mjs` — NYC PLUTO connector; extend to return additional fields (construction type, building style, unit breakdowns)
- `lib/open-property/cities/boston.mjs` — Boston connector pattern (reference for adding other cities)
- `lib/open-property/geocode.mjs` — geocoder; `inferMetroFromGeocode()` detects nyc/boston/generic

### Existing AI Infrastructure
- `lib/llm-chat.js` — existing Gemini wrapper; review before creating new LangGraph AI calls
- `zoning-knowledge-base.js` — existing zoning knowledge base; supplement with live API data
- `zoning-consultant-prompt.js` — existing zoning analysis prompt; adapt for LangGraph analyze node
- `feasibility-prompt.js` — existing AI prompt pattern; reference for Gemini structured output

### Reference Architecture
- https://github.com/langchain-ai/deepagents.git — user-specified reference for multi-agent patterns
- https://github.com/langchain-ai/langgraph.git — LangGraph framework reference

### Phase 1 Output (what Phase 2 receives)
- `app/api/property/enrich/route.js` — Phase 2's enrich_property node calls this endpoint
- `.planning/phases/01-property-data-api-layer/01-PLAN.md` — Phase 1 plan; shows exact response shape

### Existing UI Patterns
- `components/site/SiteChrome.jsx` — nav wrapper; wrap new pages in this
- `components/homeowner-feasibility/FeasibilityChat.jsx` — existing AI chat component; reference for async AI call UI pattern

</canonical_refs>

<code_context>
## Reusable Assets

### Already Built (use directly)
- `lib/open-property/attom.mjs` — complete, returns: ownerName, block, lot, lotSizeSqFt, useOccupancy, propertyType, yearBuilt, assessedValue, bedrooms, bathrooms, stories, buildingSqFt
- `lib/open-property/cities/nyc.mjs` — PLUTO connector, returns: zoningDistrict, buildingClass, lotAreaSqFt, useAndOccupancyNote
- `app/api/property/enrich/route.js` (from Phase 1) — flat response with all enriched fields
- `lib/api-cors.js` — CORS headers for all API routes (pattern: `{ headers: CORS_HEADERS }`)

### Needs Extension
- `lib/open-property/cities/nyc.mjs` — extend to return: numFloors, residentialArea, commercialArea, residentialUnits, commercialUnits, buildingStyle, frontage, depth, constructionType, taxClass from PLUTO fields

### New Files to Create
- `lib/langgraph/property-pipeline.mjs` — LangGraph StateGraph with 4 nodes
- `app/api/opportunity/analyze/route.js` — POST handler that runs the graph
- `app/opportunity-report/page.jsx` — client component with address form + report render
- `components/property/ReportCard.jsx` — two-column card layout component
- `components/property/OpportunityAssessment.jsx` — AI output structured display

### Environment Variables (all already in .env.local)
- `ATTOMDATA_API_KEY` — AttomData
- `GOOGLE_API_KEY` — Gemini
- `GEMINI_MODEL=gemini-2.5-flash` — model name for LangGraph GoogleGenerativeAI

</code_context>

<specifics>
## Exact Report Spec

Render these fields verbatim from the user's specification:

```
Property Information:
Address: [streetLine from geocoder]
Borough: [from NYC PLUTO or geocoder context]
Block: [block from AttomData/PLUTO]
Lot: [lot from AttomData/PLUTO]
Property Owner: [ownerName from AttomData]
Type: [buildingClass code] - [buildingClass description]
Tax class: [taxClass from PLUTO/AttomData]
Number of Buildings: [numBuildings]
Year Built: [yearBuilt from AttomData]
Number of stories: [stories from AttomData/PLUTO]
Total Area: [buildingSqFt]
Total Units: [totalUnits]
Residential Area: [residentialArea]
Residential Units: [residentialUnits]
Commercial Area: [commercialArea]
Commercial Units: [commercialUnits]
Building Style: [buildingStyle]
Building Frontage: [frontage]
Building Depth: [depth]
Construction Type: [constructionType]

Land Information:
Land Frontage: [landFrontage from PLUTO]
Land Depth: [landDepth from PLUTO]
Land Area: [lotAreaSqFt]
Zoning: [zoningDistrict]
```

Fields that AttomData/PLUTO don't return should show "—" (not null/undefined).

</specifics>

<deferred>
## Deferred Ideas

- Multi-city live zoning APIs beyond NYC/Boston — Phase 3+ or future milestone
- PDF export of opportunity report — future
- Saved/cached reports — no database in v1
- User accounts — out of scope

</deferred>

---

*Phase: 02-langgraph-ai-pipeline-report-page*
*Context gathered: 2026-06-14 via discuss-phase*
