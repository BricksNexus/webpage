# BricksNexus Property Intelligence — Roadmap

**Project:** BricksNexus Property Intelligence
**Code:** BNX
**Total phases:** 3
**Requirements:** PROP-01 through PROP-10 (12 requirements)

---

## Phase 1: Property Data API Layer

**Goal:** Wire AttomData and existing open-property pipeline into a unified `/api/property/enrich` endpoint that returns owner, block/lot, zoning, use/occupancy, and validated address for any US address.

**Requirements:** PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06

**Success Criteria:**
1. `POST /api/property/enrich` accepts `{ address: string }` and returns JSON with `owner`, `blockLot`, `validatedAddress`, `zoning`, `useOccupancy`, `assessedValue`
2. AttomData `/property/basicprofile` is called and its owner name + APN (block/lot) appear in the response
3. NYC PLUTO zoning data is included for NYC addresses (zone district, max FAR, allowed uses)
4. Census geocoder validates and normalizes the address
5. `npm run build` passes with no errors

**Depends on:** Nothing (Phase 1 is standalone)

**UI hint:** no

**Files to create/modify:**
- `lib/open-property/attom.mjs` — AttomData client (complete/fix)
- `lib/open-property/fetch-property-intel.mjs` — merge AttomData into pipeline
- `app/api/property/enrich/route.js` — new unified enrichment endpoint

---

## Phase 2: LangGraph AI Pipeline + Property Report Page

**Goal:** Build a LangGraph multi-step pipeline that takes enriched property data and produces a structured AI opportunity assessment. Display the full Property Opportunity Report at `/opportunity-report`.

**Requirements:** PROP-07, PROP-08-A, PROP-08-B, PROP-10

**Depends on:** Phase 1

**Success Criteria:**
1. LangGraph graph with nodes: `enrich_data → analyze_zoning → assess_opportunity → format_report` executes end-to-end
2. `/opportunity-report?address=...` page renders: owner name, address, block/lot, zoning summary, use/occupancy, and AI opportunity text
3. "Publish to Marketplace" button appears on the report page
4. Gemini AI generates a 2-3 paragraph opportunity assessment that references specific zoning and use data
5. `npm run build` passes with no errors

**UI hint:** yes

**Files to create/modify:**
- `lib/langgraph/property-pipeline.mjs` — LangGraph graph definition
- `app/opportunity-report/page.jsx` — report display page
- `components/property/ReportCard.jsx` — report UI component
- `app/api/opportunity/analyze/route.js` — API route triggering LangGraph pipeline

---

## Phase 3: Marketplace

**Goal:** Allow users to publish analyzed properties and browse them on a public marketplace page at `/marketplace`.

**Requirements:** PROP-08-B (publish action), PROP-09-A, PROP-09-B, PROP-09-C

**Depends on:** Phase 2

**Success Criteria:**
1. Clicking "Publish to Marketplace" on a report saves the opportunity to `data/marketplace.json`
2. `GET /marketplace` page renders published opportunity cards (address, AI summary snippet, zoning class)
3. Each card links to `/opportunity-report?address=...` (full report view)
4. `POST /api/marketplace` saves an opportunity; `GET /api/marketplace` returns all saved opportunities
5. `npm run build` passes with no errors

**UI hint:** yes

**Files to create/modify:**
- `app/marketplace/page.jsx` — marketplace listing page
- `components/property/OpportunityCard.jsx` — marketplace card component
- `app/api/marketplace/route.js` — GET + POST handler
- `data/marketplace.json` — JSON file storage (created on first publish)

---

## Requirement → Phase Traceability

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| PROP-01 | 1 | Address input triggers property analysis |
| PROP-02 | 1 | Owner name from AttomData |
| PROP-03 | 1 | Block & lot from AttomData |
| PROP-04 | 1 | Address validation via Census geocoder |
| PROP-05 | 1 | Zoning data from city sources (NYC PLUTO) |
| PROP-06 | 1 | Use & occupancy from AttomData |
| PROP-07 | 2 | AI development opportunity assessment |
| PROP-08-A | 2 | Property Opportunity Report UI |
| PROP-08-B | 2 | "Publish to Marketplace" button |
| PROP-09-A | 3 | Marketplace JSON storage |
| PROP-09-B | 3 | Marketplace listing page |
| PROP-09-C | 3 | Full report accessible from marketplace |
| PROP-10 | 2 | LangGraph orchestration |
