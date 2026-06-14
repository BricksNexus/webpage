# Phase 2: LangGraph AI Pipeline + Property Report Page — Research

**Researched:** 2026-06-14
**Domain:** LangGraph JS (StateGraph), @langchain/google-genai, NYC PLUTO API, Next.js API routes, React report UI
**Confidence:** HIGH (codebase verified), MEDIUM (LangGraph JS plain-JS patterns), HIGH (PLUTO field names)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Linear 4-node LangGraph graph: `enrich_property → fetch_zoning_rules → analyze_opportunity → format_report`
- Packages: `@langchain/langgraph`, `@langchain/google-genai`
- No TypeScript — all files are `.mjs` (pipeline/lib) or `.jsx` (UI). No `.ts` or `.tsx`.
- AI returns structured JSON (not free-text) with `canBuildMore`, `additionalUnitsEstimate`, `canAddFloors`, `conversionOpportunity`, `farUsed`, `farAllowed`, `farRemaining`, `heightLimitStories`, `currentStories`, `opportunities[]`, `summary`
- NYC uses PLUTO live data; other cities use Gemini knowledge
- Entry: `/opportunity-report` page with address form + URL query param strategy (`?address=...`)
- API route: `POST /api/opportunity/analyze` triggers full pipeline
- Input to pipeline: `{ address: string }`

### Claude's Discretion
- Internal state shape of the LangGraph StateAnnotation (as long as 4-node contract is honored)
- Zod schema vs plain JSON schema for `withStructuredOutput`
- Exact CSS/layout implementation of report cards

### Deferred Ideas (OUT OF SCOPE)
- Multi-city live zoning APIs beyond NYC/Boston
- PDF export
- Saved/cached reports (no database in v1)
- User accounts
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROP-07 | System generates a natural-language development opportunity assessment combining zoning and use/occupancy data via Gemini AI | LangGraph `analyze_opportunity` node + `@langchain/google-genai` `withStructuredOutput` |
| PROP-08-A | System displays a structured Property Opportunity Report with all required fields | `app/opportunity-report/page.jsx` + `ReportCard.jsx` + `OpportunityAssessment.jsx` |
| PROP-08-B | Report has a "Publish to Marketplace" button | Button in `OpportunityAssessment.jsx` (no backend yet — Phase 3) |
| PROP-10 | LangGraph orchestrates the multi-step data enrichment → AI analysis pipeline | `lib/langgraph/property-pipeline.mjs` with StateGraph 4-node linear chain |
</phase_requirements>

---

## Summary

Phase 2 builds a LangGraph multi-step pipeline (`property-pipeline.mjs`) and a new `/opportunity-report` page. The pipeline is a linear 4-node StateGraph that enriches property data, fetches zoning rules, runs Gemini AI analysis with structured JSON output, and formats the final report. The UI page handles address input, calls `POST /api/opportunity/analyze`, and renders a two-column card layout plus AI assessment panel.

**Critical pre-work (not done in Phase 1):** The `/api/property/enrich` route was specified in Phase 1 but was NOT created — only `/api/property` exists. Phase 2 must create the enrich alias route as Task 0 before the pipeline can call it. Alternatively the pipeline can call `/api/property` directly; the plan should pick one.

**Primary recommendation:** Create `enrich` alias first (5 min task), then implement the pipeline and UI. Use `@langchain/google-genai`'s `ChatGoogleGenerativeAI` with `withStructuredOutput()` and a plain JSON schema object (no Zod, no TypeScript) for the AI node.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Property enrichment (attom + PLUTO + geocode) | API / Backend (existing) | — | `fetchPropertyIntel` already server-side in `lib/open-property/` |
| Zoning rules fetch (PLUTO extension) | API / Backend | — | PLUTO Socrata API calls must be server-side (avoid CORS, keep credentials) |
| AI analysis (Gemini structured output) | API / Backend | — | `GOOGLE_API_KEY` is a server secret; LLM calls never in browser |
| LangGraph orchestration | API / Backend | — | `StateGraph.invoke()` runs inside Next.js API route handler on Node.js |
| Report display | Browser / Client | — | `"use client"` page component with `useState` for loading, address, report |
| URL param strategy (`?address=`) | Browser / Client | Frontend Server (SSR) | `useSearchParams()` reads URL on client; no SSR needed |
| SiteChrome nav | Frontend Server (layout.jsx) | — | Already in `app/layout.jsx` — wraps all pages automatically |

---

## 1. Installation Check

**Status: NOT INSTALLED** [VERIFIED: package.json in codebase]

Neither `@langchain/langgraph` nor `@langchain/google-genai` appear in `package.json`. They must be installed.

**Current package.json dependencies:**
```json
{
  "next": "latest",
  "react": "latest",
  "react-dom": "latest",
  "react-hook-form": "latest",
  "lucide-react": "latest"
}
```

**Verified npm latest versions:** [VERIFIED: npm registry, 2026-06-14]
- `@langchain/langgraph`: **1.4.2**
- `@langchain/google-genai`: **2.1.31**
- `@langchain/core`: **1.1.49** (peer dependency, auto-resolved)

**Install command:**
```bash
npm install @langchain/langgraph @langchain/google-genai
```

`@langchain/core` will be installed automatically as a peer dependency of both packages.

---

## 2. LangGraph JS API — StateGraph in Plain .mjs (No TypeScript)

**Confidence: MEDIUM** — Context7 docs show TypeScript generics throughout. Plain JS pattern confirmed via community sources and is mechanically equivalent (just drop the `<Type>` annotations).

[CITED: https://langchain-ai.github.io/langgraphjs/]
[CITED: https://medium.com/@barsegyan96armen/langgraph-101-understanding-the-core-concepts-of-state-nodes-and-edges-in-javascript-f91068683d7d]

### The TypeScript Generics Problem

All official LangGraph JS docs use TypeScript syntax:
```typescript
// TypeScript only — does NOT work in .mjs
const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  answer: Annotation<string>,
});
```

**In plain `.mjs`, drop the `<Type>` angle brackets entirely.** `Annotation` without a generic is the plain-JS form:

```javascript
// Plain JS — works in .mjs
import { Annotation } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  someString: Annotation,          // bare Annotation = last-write-wins, any type
  someArray: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  someObject: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  someBoolean: Annotation({
    default: () => null,
  }),
});
```

### The 4-Node Linear Pattern for property-pipeline.mjs

```javascript
// lib/langgraph/property-pipeline.mjs
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

// State flows through all 4 nodes — each node reads from state and returns new fields
const PipelineState = Annotation.Root({
  // Input
  address: Annotation,

  // Node 1 output: enrich_property
  property: Annotation({
    default: () => null,
    reducer: (x, y) => y ?? x,
  }),

  // Node 2 output: fetch_zoning_rules
  zoningRules: Annotation({
    default: () => null,
    reducer: (x, y) => y ?? x,
  }),

  // Node 3 output: analyze_opportunity
  aiAssessment: Annotation({
    default: () => null,
    reducer: (x, y) => y ?? x,
  }),

  // Node 4 output: format_report
  report: Annotation({
    default: () => null,
    reducer: (x, y) => y ?? x,
  }),
});

// Node functions — each is async, receives full state, returns partial state update
async function enrichProperty(state) {
  // calls /api/property/enrich or fetchPropertyIntel directly
  // returns { property: { ... } }
}

async function fetchZoningRules(state) {
  // uses state.property.zoningDistrict + state.property.localRecords.nyc
  // returns { zoningRules: { ... } }
}

async function analyzeOpportunity(state) {
  // calls Gemini with withStructuredOutput
  // returns { aiAssessment: { canBuildMore, ... } }
}

async function formatReport(state) {
  // merges state.property + state.zoningRules + state.aiAssessment
  // returns { report: { ... } }
}

// Build graph
const workflow = new StateGraph(PipelineState)
  .addNode("enrich_property", enrichProperty)
  .addNode("fetch_zoning_rules", fetchZoningRules)
  .addNode("analyze_opportunity", analyzeOpportunity)
  .addNode("format_report", formatReport)
  .addEdge(START, "enrich_property")
  .addEdge("enrich_property", "fetch_zoning_rules")
  .addEdge("fetch_zoning_rules", "analyze_opportunity")
  .addEdge("analyze_opportunity", "format_report")
  .addEdge("format_report", END);

export const propertyPipeline = workflow.compile();

// Usage: const result = await propertyPipeline.invoke({ address: "305 East 105th St..." });
// result.report = the final merged report object
```

### `enrich_property` Node — Direct Library Call vs HTTP

Two options for how the `enrich_property` node gets data:

| Option | Pattern | Pro | Con |
|--------|---------|-----|-----|
| **A: Direct import** | `import { fetchPropertyIntel } from "../open-property/fetch-property-intel.mjs"` | No HTTP overhead, no port dependency | Pipeline and route share same process (fine for Next.js) |
| **B: HTTP call to self** | `fetch("http://localhost:3000/api/property/enrich", ...)` | Clean separation | Requires running server; brittle in tests |

**Recommendation: Option A (direct import).** The pipeline runs inside the Next.js Node.js process. Import `fetchPropertyIntel` directly — no self-HTTP call needed. The `/api/property/enrich` route is still useful for external callers.

---

## 3. @langchain/google-genai Structured Output

**Confidence: HIGH** [CITED: https://github.com/langchain-ai/langchain-google]

### Import and Initialization

```javascript
// Works in .mjs — no TypeScript needed
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});
```

### withStructuredOutput — Plain JSON Schema (No Zod, No TypeScript)

`withStructuredOutput()` accepts a plain JSON schema dict. This is the correct approach for `.mjs` without Zod or TypeScript.

**Method:** Use `"json_schema"` (default, recommended over `"function_calling"`) — uses Gemini native structured output, more reliable.

```javascript
// Plain JSON schema — works in .mjs without Zod or TypeScript
const opportunitySchema = {
  title: "OpportunityAssessment",
  type: "object",
  properties: {
    canBuildMore: { type: "boolean", description: "Can the owner build additional units?" },
    additionalUnitsEstimate: { type: "number", description: "Estimated additional units possible" },
    canAddFloors: { type: "boolean", description: "Can floors be added?" },
    conversionOpportunity: { type: "string", description: "Residential/commercial conversion description" },
    farUsed: { type: "number", description: "Current FAR used" },
    farAllowed: { type: "number", description: "Maximum FAR allowed by zoning" },
    farRemaining: { type: "number", description: "Remaining FAR capacity" },
    heightLimitStories: { type: "number", description: "Max stories allowed by zoning" },
    currentStories: { type: "number", description: "Current number of stories" },
    opportunities: {
      type: "array",
      items: { type: "string" },
      description: "List of specific development opportunity bullets",
    },
    summary: { type: "string", description: "2-3 paragraph narrative assessment" },
  },
  required: ["canBuildMore", "additionalUnitsEstimate", "canAddFloors", "conversionOpportunity",
             "farUsed", "farAllowed", "farRemaining", "opportunities", "summary"],
};

const structuredModel = model.withStructuredOutput(opportunitySchema, {
  name: "OpportunityAssessment",
  // method: "json_schema" is the default and recommended
});

// In the analyze_opportunity node:
async function analyzeOpportunity(state) {
  const { property, zoningRules } = state;
  const prompt = buildAnalysisPrompt(property, zoningRules);
  const assessment = await structuredModel.invoke(prompt);
  return { aiAssessment: assessment };
}
```

### existing `llm-chat.js` — NOT usable for this phase

`lib/llm-chat.js` is an **OpenRouter/OpenAI wrapper** (raw HTTP fetch to OpenRouter API). It has no `withStructuredOutput` capability and is NOT a LangChain class. It cannot be used for the LangGraph analyze node.

**Use `ChatGoogleGenerativeAI` from `@langchain/google-genai` directly.** The `GOOGLE_API_KEY` env var is already set. `llm-chat.js` remains for the existing FeasibilityChat flow — leave it untouched.

---

## 4. NYC PLUTO Field Mapping

**Confidence: HIGH** [VERIFIED: NYC Open Data API columns endpoint, official PLUTO docs, community sources]

The existing `nyc.mjs` connector calls the Socrata API at:
```
https://data.cityofnewyork.us/resource/{NYC_PLUTO_SODA_DATASET_ID}.json?bbl={bbl}&$limit=1
```

### Current nyc.mjs Returns
```javascript
{
  ok: true,
  source: "nyc_open_data_socrata_pluto",
  bbl,
  zoningDistrict,   // from row.zonedist1
  buildingClass,    // from row.bldgclass
  lotAreaSqFt,      // from row.lotarea
  useAndOccupancyNote,
  rawRowKeys,       // ALL keys in the PLUTO row (useful for debugging)
}
```

### Missing Fields — PLUTO Socrata Field Names (Exact Lowercase)

[VERIFIED: NYC Open Data columns API + community sources]

| Report Field | PLUTO Socrata Field | Notes |
|-------------|--------------------|-|
| `numFloors` | `numfloors` | Number of full/partial floors |
| `residentialArea` | `resarea` | Residential floor area sq ft |
| `commercialArea` | `comarea` | Commercial floor area sq ft |
| `totalBuildingArea` | `bldgarea` | Total building floor area sq ft |
| `residentialUnits` | `unitsres` | Residential unit count |
| `totalUnits` | `unitstotal` | Sum residential + non-residential |
| `buildingFrontage` | `bldgfront` | Building frontage in feet |
| `lotFrontage` | `lotfront` | Lot frontage in feet |
| `lotDepth` | `lotdepth` | Lot depth in feet |
| `yearBuilt` | `yearbuilt` | Year built |
| `numBuildings` | `numbldgs` | Number of buildings on lot |
| `block` | `block` | Tax block number |
| `lot` | `lot` | Tax lot number |

### Fields NOT Available in PLUTO (use alternatives)

| Report Field | Status | Alternative |
|-------------|--------|-------------|
| `buildingDepth` | [ASSUMED] Not in Socrata PLUTO | May be in MapPLUTO GIS version but not the Socrata table; use `"—"` |
| `taxClass` | [ASSUMED] Field may be `taxclassat` or `taxclass` | Try `row.taxclassat \|\| row.taxclass \|\| null`; also available from AttomData |
| `buildingStyle` | [ASSUMED] Called `proxcode`/`proxdescription` in older PLUTO | Try `row.proxdescription \|\| row.landuse \|\| null`; show `"—"` if absent |
| `constructionType` | [ASSUMED] Not a direct PLUTO field | May appear as `ext` (interior/exterior structure indicator) or `bsmtcode` (basement type); use `"—"` |
| `commercialUnits` | No dedicated field | Derive: `unitstotal - unitsres` or use `"—"` |

**Practical guidance:** The `rawRowKeys` already returned by the existing connector will reveal all actual field names present at runtime. The extend task for `nyc.mjs` should try all candidate field names and fall back to `null`.

### Updated nycFetchPlutoByBbl Return Shape

```javascript
// Extension to nyc.mjs — add these fields to the returned object
return {
  ok: true,
  source: "nyc_open_data_socrata_pluto",
  bbl,
  // existing
  zoningDistrict:   row.zonedist1 || row.Zonedist1 || row.zonedist || null,
  buildingClass:    row.bldgclass || row.BldgClass || null,
  lotAreaSqFt:      row.lotarea != null ? Number(row.lotarea) : null,
  // new fields
  numFloors:        row.numfloors != null ? Number(row.numfloors) : null,
  residentialArea:  row.resarea != null ? Number(row.resarea) : null,
  commercialArea:   row.comarea != null ? Number(row.comarea) : null,
  totalBuildingArea: row.bldgarea != null ? Number(row.bldgarea) : null,
  residentialUnits: row.unitsres != null ? Number(row.unitsres) : null,
  totalUnits:       row.unitstotal != null ? Number(row.unitstotal) : null,
  buildingFrontage: row.bldgfront != null ? Number(row.bldgfront) : null,
  lotFrontage:      row.lotfront != null ? Number(row.lotfront) : null,
  lotDepth:         row.lotdepth != null ? Number(row.lotdepth) : null,
  yearBuilt:        row.yearbuilt != null ? Number(row.yearbuilt) : null,
  numBuildings:     row.numbldgs != null ? Number(row.numbldgs) : null,
  block:            row.block || null,
  lot:              row.lot || null,
  taxClass:         row.taxclassat || row.taxclass || null,      // try both
  buildingStyle:    row.proxdescription || row.landuse || null,  // best effort
  buildingDepth:    row.bldgdepth || null,                       // GIS only, likely null
  constructionType: row.ext || row.bsmtcode || null,            // best effort
  useAndOccupancyNote: "PLUTO does not replace a Certificate of Occupancy...",
  rawRowKeys: Object.keys(row),
};
```

---

## 5. Enrich Endpoint Response — What Phase 2 Receives

**Status of `/api/property/enrich`:** [VERIFIED: codebase] **Does NOT exist.** Only `/api/property` exists.

Phase 1 planned the enrich alias route (in 01-PLAN.md Task 1.2) but it was not implemented. The file `app/api/property/enrich/route.js` is absent.

### What `/api/property` Currently Returns (Phase 1 actual state)

The existing `POST /api/property` returns `{ ok: true, property: <full fetchPropertyIntel result> }`.

The full `fetchPropertyIntel` result includes:
```javascript
{
  inputAddress, fetchedAt, dataQuality, geocode, jurisdiction,
  openStreetMap, localRecords, derivedSummary, limitations, discoverMore,
  // flattened for UI:
  zoningDistrict,     // from PLUTO or OSM or Boston
  lotAreaSqFt,        // from PLUTO or AttomData
  useAndOccupancy,    // combined hint string
  city, region, streetLine,
  ownerName,          // from AttomData
  blockLot,           // "Block X / Lot Y" formatted string
  attomData: {        // null if no API key or not found
    yearBuilt, assessedValue, bedrooms, bathrooms,
    stories, buildingSqFt
  },
  // NOTE: localRecords.nyc.pluto only contains current 4 fields (zoningDistrict, buildingClass, lotAreaSqFt)
  // After Phase 2 nyc.mjs extension it will contain all new fields
}
```

### Fields Present vs Missing for Phase 2 Report

| Report Field | Source | Present in /api/property now? |
|-------------|--------|-------------------------------|
| Address | `streetLine` | YES |
| Borough | `geocode.context.city` / `geocode.context.region` | PARTIAL (city yes, borough label needs mapping) |
| Block | `derivedSummary.blockLot` (formatted) OR `attomData.block` | PARTIAL (formatted string, not raw number) |
| Lot | same | PARTIAL |
| Property Owner | `ownerName` | YES (if AttomData key set) |
| Year Built | `attomData.yearBuilt` | YES (if AttomData key set) |
| Total Area | `attomData.buildingSqFt` | YES (if AttomData key set) |
| Stories | `attomData.stories` | YES (if AttomData key set) |
| Zoning | `zoningDistrict` | YES |
| Lot Area | `lotAreaSqFt` | YES (PLUTO) |
| Building Class | `localRecords.nyc.pluto.buildingClass` | YES |
| Number of Floors | `localRecords.nyc.pluto.numFloors` | NO — requires nyc.mjs extension |
| Residential Area | `localRecords.nyc.pluto.residentialArea` | NO — requires nyc.mjs extension |
| Commercial Area | `localRecords.nyc.pluto.commercialArea` | NO — requires nyc.mjs extension |
| Residential Units | `localRecords.nyc.pluto.residentialUnits` | NO — requires nyc.mjs extension |
| Commercial Units | derived from PLUTO | NO — requires nyc.mjs extension |
| Building Frontage | `localRecords.nyc.pluto.buildingFrontage` | NO — requires nyc.mjs extension |
| Lot Frontage | `localRecords.nyc.pluto.lotFrontage` | NO — requires nyc.mjs extension |
| Lot Depth | `localRecords.nyc.pluto.lotDepth` | NO — requires nyc.mjs extension |
| Building Style | `localRecords.nyc.pluto.buildingStyle` | NO — best effort |
| Construction Type | `localRecords.nyc.pluto.constructionType` | NO — best effort |
| Tax Class | `localRecords.nyc.pluto.taxClass` | NO — requires nyc.mjs extension |
| Number of Buildings | `localRecords.nyc.pluto.numBuildings` | NO — requires nyc.mjs extension |

**Conclusion:** Extending `nyc.mjs` is the critical data gap. Without it, ~12 of the 22 report fields will show `"—"`.

---

## 6. Reusable Assets

### zoning-knowledge-base.js

[VERIFIED: codebase at `lib/homeowner-feasibility/zoning-knowledge-base.js`]

Contains `ZONING_KNOWLEDGE_BASE` — a simplified JSON of NYC/Boston zoning patterns with FAR concepts, density, ADU notes, and `genericWhenNotNYCOrBoston` guidance. Exports `getZoningKnowledgeBaseJson()`.

**Use in `fetch_zoning_rules` and `analyze_opportunity` nodes:** Inject this knowledge base into the Gemini prompt for the analyze node, especially for non-NYC cities. For NYC, supplement it with live PLUTO FAR data. The knowledge base already contains R-zone FAR concepts (R6-R10 "higher FAR") that align with the structured output schema fields like `farAllowed`.

Import path in pipeline `.mjs`:
```javascript
import { getZoningKnowledgeBaseJson } from "../homeowner-feasibility/zoning-knowledge-base.js";
```

### zoning-consultant-prompt.js

[VERIFIED: codebase at `lib/homeowner-feasibility/zoning-consultant-prompt.js`]

The existing `buildZoningConsultantSystemPrompt()` is designed for **free-text chat** (3-section Markdown format: Current Status / Potential for Growth / Regulatory Hurdles). It is NOT suitable for the `analyze_opportunity` node which must return **structured JSON**.

**Do not reuse this prompt directly.** Write a new `buildOpportunityAnalysisPrompt(property, zoningRules)` function for the pipeline. However, you CAN reuse the zoning knowledge base injection pattern from this file.

### FeasibilityChat.jsx — UI Pattern Reference

[VERIFIED: codebase at `components/homeowner-feasibility/FeasibilityChat.jsx`]

The async loading/error/results state pattern to replicate for `/opportunity-report/page.jsx`:

```javascript
// Pattern from FeasibilityChat.jsx (adapt for opportunity report)
const [address, setAddress] = useState("");
const [report, setReport] = useState(null);       // replaces setProperty/setMessages
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleAnalyze = async () => {
  setError("");
  setLoading(true);
  try {
    const res = await fetch("/api/opportunity/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: address.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");
    setReport(data.report);
    // update URL: window.history.replaceState({}, "", `?address=${encodeURIComponent(address)}`);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};
```

**Key difference from FeasibilityChat:** No streaming, no message list. Single request → single structured report object.

### SiteChrome.jsx

[VERIFIED: codebase at `components/site/SiteChrome.jsx`]

`SiteChrome` takes **no props** — it reads `usePathname()` internally. It is already rendered in `app/layout.jsx` and wraps ALL pages automatically. The new `app/opportunity-report/page.jsx` does NOT need to import or render SiteChrome. Just export a `<main>` element.

Nav item for the new page is NOT in the current NAV array. Add `{ href: "/opportunity-report", label: "Opportunity Report" }` to SiteChrome's `NAV` constant.

### api-cors.js

[VERIFIED: codebase at `lib/api-cors.js`]

```javascript
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

All API routes need `OPTIONS` + `POST` exports with `{ headers: CORS_HEADERS }`.

---

## 7. Implementation Risks and Gotchas

### Risk 1: `Annotation<Type>` Syntax is TypeScript-Only — Will Fail in .mjs

**What goes wrong:** Copy-pasting LangGraph docs examples directly into `.mjs` files. `Annotation<string>` is TypeScript generic syntax and throws a SyntaxError in plain JavaScript.

**Prevention:** Use bare `Annotation` or `Annotation({ reducer, default })` object form — never angle brackets. [VERIFIED: confirmed via community plain-JS examples]

### Risk 2: LangGraph Not Installed — Build Will Fail Immediately

**What goes wrong:** `import { Annotation, StateGraph } from "@langchain/langgraph"` throws Module not found.

**Prevention:** `npm install @langchain/langgraph @langchain/google-genai` must be the FIRST task. Run `npm run build` to verify before writing pipeline code. [VERIFIED: package.json has no langgraph]

### Risk 3: next.config.mjs Has No `transpilePackages` — LangGraph May Have ESM/CJS Issues

**What goes wrong:** Next.js 15 bundles API routes as CommonJS by default. LangGraph 1.x ships as ESM. This can cause `require()` of ES Module errors.

**Prevention:** The existing codebase already imports `.mjs` files (e.g., `fetch-property-intel.mjs`) successfully via `@/` alias path from `app/api/property/route.js` (CommonJS context). This works because Next.js App Router API routes are bundled by webpack with ESM interop. However, if issues arise, add to `next.config.mjs`:

```javascript
const nextConfig = {
  transpilePackages: ["@langchain/langgraph", "@langchain/google-genai", "@langchain/core"],
  // ...existing redirects
};
```

[ASSUMED] The existing `.mjs` import pattern works — `transpilePackages` may not be needed, but keep it as the fallback.

### Risk 4: `useSearchParams()` Requires Suspense Boundary in Next.js 15

**What goes wrong:** `useSearchParams()` in a Client Component causes Next.js to throw: "useSearchParams() should be wrapped in a suspense boundary."

**Prevention:** Wrap the component that reads `useSearchParams()` in `<Suspense fallback={...}>` or read the address from a form state variable and update the URL imperatively with `window.history.replaceState()`. The latter avoids Suspense entirely and matches the FeasibilityChat pattern. [CITED: Next.js 15 App Router docs]

### Risk 5: PLUTO Socrata Dataset ID Not Set

**What goes wrong:** `NYC_PLUTO_SODA_DATASET_ID` env var not in `.env.local` → `nyc.mjs` returns `{ ok: false, skipped: true }` → all new PLUTO fields are null → report shows "—" everywhere.

**Prevention:** CONTEXT.md says env vars are already set. Verify at task start by checking that `fetch_zoning_rules` receives non-null `zoningRules`. Note current Socrata dataset IDs for PLUTO: `64uk-42ks` (PLUTO) or `f888-ni5f` (MapPLUTO). [VERIFIED: NYC Open Data]

### Risk 6: Pipeline Calling Itself via HTTP (circular dependency)

**What goes wrong:** If `enrich_property` node does `fetch("http://localhost:3000/api/property/enrich")` from within the `/api/opportunity/analyze` handler, it makes an HTTP call back to the same Next.js server — creating a request dependency that breaks during `npm run build` static analysis and can cause timeouts in dev.

**Prevention:** Use direct import pattern (Option A in section 2 above): import `fetchPropertyIntel` directly into the pipeline. No self-HTTP calls. [ASSUMED: this is standard Next.js architecture guidance]

### Risk 7: Gemini Structured Output Fails if Schema Has `null` Type

**What goes wrong:** Gemini's `json_schema` mode may reject JSON schemas with `"type": ["string", "null"]` union types or `null` defaults in schema.

**Prevention:** Keep the schema simple — use only `string`, `number`, `boolean`, `array`. If a field could be null, use `string` and allow the AI to return `"unknown"` or `"0"`. [CITED: LangChain Google docs on `json_schema` method]

---

## 8. Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gemini structured JSON output | Custom prompt + JSON.parse() | `ChatGoogleGenerativeAI.withStructuredOutput(schema)` | Handles schema enforcement, retry logic, partial streaming, error recovery |
| Pipeline orchestration | Manual `await fn1(); await fn2()` chain | LangGraph `StateGraph` | State propagation, error isolation per node, future extensibility to parallel/conditional |
| TypeScript-only state definitions | Re-implementing Annotation logic | `Annotation({reducer, default})` — plain JS form | Already supported, just needs plain JS syntax |

---

## 9. Fetch Zoning Rules Node — City Tiering Logic

The `fetch_zoning_rules` node must handle the three-tier approach from CONTEXT.md:

```javascript
async function fetchZoningRules(state) {
  const { property } = state;
  // property.localRecords tells us which city connector ran
  const isNYC = property.localRecords?.nyc?.pluto?.ok;
  const isBoston = property.localRecords?.boston?.assessing?.ok;

  if (isNYC) {
    const pluto = property.localRecords.nyc.pluto;
    // PLUTO already has zoningDistrict — fetch FAR/height limits from knowledge base
    // or query a zoning lookup by zone code
    return {
      zoningRules: {
        source: "nyc_pluto",
        zoningDistrict: pluto.zoningDistrict,
        // FAR values from static lookup or Gemini knowledge
        // For v1: use ZONING_KNOWLEDGE_BASE + Gemini to derive FAR
        rawPluto: pluto,
      }
    };
  }

  if (isBoston) {
    // Similar pattern — Boston connector already fetched zoningDistrict
    return { zoningRules: { source: "boston_assessing", ... } };
  }

  // Generic: pass geocode context to Gemini in analyze step
  return {
    zoningRules: {
      source: "gemini_knowledge",
      zoningDistrict: property.zoningDistrict,
      note: "Non-NYC/Boston city: AI will apply general zoning principles",
    }
  };
}
```

**For v1 NYC FAR data:** The PLUTO dataset contains `residfar` and `commfar` fields (residential FAR and commercial FAR allowed). Add these to the `nycFetchPlutoByBbl` extension:

| FAR Field | PLUTO Socrata Name |
|-----------|-------------------|
| Residential FAR allowed | `residfar` |
| Commercial FAR allowed | `commfar` |
| Manufacturing FAR allowed | `mfar` |
| Facilitated residential FAR | `facilfar` |

These can be returned from the `fetch_zoning_rules` node directly from the already-fetched PLUTO data.

---

## 10. Report UI Architecture

### page.jsx Pattern

The `/opportunity-report/page.jsx` must be a Client Component (`"use client"`) because it reads `useSearchParams()` and manages form state.

```jsx
// app/opportunity-report/page.jsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReportCard from "@/components/property/ReportCard";
import OpportunityAssessment from "@/components/property/OpportunityAssessment";

function OpportunityReportPage() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-run if URL has address on load
  useEffect(() => {
    const urlAddress = searchParams.get("address");
    if (urlAddress && !report) handleAnalyze(urlAddress);
  }, []);

  // ... handleAnalyze, form render, two-column layout, AI panel
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <OpportunityReportPage />
    </Suspense>
  );
}
```

### Component Breakdown

| Component | File | Responsibility |
|-----------|------|----------------|
| Page | `app/opportunity-report/page.jsx` | Form, state, fetch, Suspense boundary |
| ReportCard | `components/property/ReportCard.jsx` | Two-column: Property Info + Land/Zoning info |
| OpportunityAssessment | `components/property/OpportunityAssessment.jsx` | AI output: FAR gauges, opportunity bullets, summary, Publish button |

### "Publish to Marketplace" Button

Per PROP-08-B: button is present but has no backend in Phase 2. In Phase 3 it will call `/api/marketplace/publish`. For now: render button, `onClick` shows a toast/alert "Coming soon — marketplace launches in Phase 3."

---

## 11. Recommended Task Breakdown (Waves)

### Wave 0 — Install and Pre-conditions (no logic yet)

| Task | Action | File |
|------|--------|------|
| 0.1 | `npm install @langchain/langgraph @langchain/google-genai` | package.json |
| 0.2 | Run `npm run build` to confirm no import breakage | — |
| 0.3 | Create `app/api/property/enrich/route.js` (from Phase 1 Task 1.2 spec — already written out in 01-PLAN.md) | app/api/property/enrich/route.js |

### Wave 1 — PLUTO Extension (data foundation)

| Task | Action | File |
|------|--------|------|
| 1.1 | Extend `nycFetchPlutoByBbl` to return all new fields (numFloors, resArea, comArea, etc.) | lib/open-property/cities/nyc.mjs |
| 1.2 | Manual test: POST `/api/property` with NYC address, verify `localRecords.nyc.pluto` has new fields | — |

### Wave 2 — LangGraph Pipeline

| Task | Action | File |
|------|--------|------|
| 2.1 | Create `lib/langgraph/property-pipeline.mjs` — StateAnnotation + 4 nodes + compile/export | lib/langgraph/property-pipeline.mjs |
| 2.2 | Implement `enrich_property` node (direct import of `fetchPropertyIntel`) | property-pipeline.mjs |
| 2.3 | Implement `fetch_zoning_rules` node (city tiering, FAR fields from PLUTO) | property-pipeline.mjs |
| 2.4 | Implement `analyze_opportunity` node (ChatGoogleGenerativeAI + withStructuredOutput + buildOpportunityAnalysisPrompt) | property-pipeline.mjs |
| 2.5 | Implement `format_report` node (merge all state fields into flat report object) | property-pipeline.mjs |

### Wave 3 — API Route

| Task | Action | File |
|------|--------|------|
| 3.1 | Create `app/api/opportunity/analyze/route.js` — POST handler, calls `propertyPipeline.invoke()`, returns `report` | app/api/opportunity/analyze/route.js |
| 3.2 | Test: `curl -X POST /api/opportunity/analyze -d '{"address":"305 East 105th St, New York, NY"}'` returns valid JSON | — |

### Wave 4 — UI

| Task | Action | File |
|------|--------|------|
| 4.1 | Create `components/property/ReportCard.jsx` — two-column property info + land info | components/property/ReportCard.jsx |
| 4.2 | Create `components/property/OpportunityAssessment.jsx` — AI panel with bullets, FAR, Publish button | components/property/OpportunityAssessment.jsx |
| 4.3 | Create `app/opportunity-report/page.jsx` — form + fetch + renders above components | app/opportunity-report/page.jsx |
| 4.4 | Add `/opportunity-report` to SiteChrome NAV array | components/site/SiteChrome.jsx |

### Wave 5 — Build Verification

| Task | Action |
|------|--------|
| 5.1 | `npm run build` — must exit 0 |
| 5.2 | End-to-end test: navigate to `/opportunity-report`, enter NYC address, verify report renders with all fields |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| OpenRouter/OpenAI for all LLM calls | `@langchain/google-genai` for structured Gemini output | Gemini 2.5 Flash has native JSON schema enforcement; more reliable than prompt-engineering JSON out of chat models |
| Free-text LLM responses parsed with regex | `withStructuredOutput(schema)` | Schema-enforced JSON, no parsing errors |
| LangGraph 0.x used `createGraph()` | LangGraph 1.x uses `new StateGraph(Annotation.Root({...}))` | Annotation-based state is the current API; avoid any `createGraph` tutorials |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Annotation` (bare, no generic) in plain JS defaults to last-write-wins behavior same as `Annotation<T>` | Section 2 | If wrong, state won't flow correctly between nodes; easy to verify at first test |
| A2 | Next.js can import `@langchain/langgraph` ESM from API route without `transpilePackages` | Section 7 Risk 3 | Build fails; fix: add `transpilePackages` to next.config.mjs |
| A3 | PLUTO Socrata fields `taxclassat` and `taxclass` are the tax class field name variants | Section 4 | Shows null for tax class; acceptable fallback (`"—"`) |
| A4 | `buildingDepth` (`bldgdepth`) is not in the Socrata PLUTO table (only in MapPLUTO GIS) | Section 4 | Field appears as null; show "—" per spec |
| A5 | `proxdescription` may not exist in Socrata PLUTO (older field from pre-2020 versions) | Section 4 | Building style shows "—"; acceptable |
| A6 | Gemini JSON schema mode does not need `"nullable": true` for optional fields | Section 3 | AI may hallucinate values; only include required fields in `required[]` |

---

## Open Questions

1. **Does `NYC_PLUTO_SODA_DATASET_ID` need to be `64uk-42ks` (PLUTO) or `f888-ni5f` (MapPLUTO)?**
   - What we know: PLUTO Socrata dataset is `64uk-42ks`. MapPLUTO is `f888-ni5f` (GIS version). `bldgdepth` and some extended fields may only be in MapPLUTO.
   - What's unclear: Which dataset ID the env var is currently set to in `.env.local`.
   - Recommendation: Try `64uk-42ks` first; if `bldgdepth` is absent, note that it requires MapPLUTO.

2. **Should `fetch_zoning_rules` do a live FAR lookup or derive from static knowledge base for v1?**
   - What we know: PLUTO returns `residfar` and `commfar` fields directly — these ARE the allowed FAR values.
   - What's unclear: Whether the env is configured enough to test live PLUTO FAR data.
   - Recommendation: Use PLUTO `residfar`/`commfar` directly for NYC (they're already in the PLUTO row). For non-NYC, pass zone code to Gemini.

3. **Is `GOOGLE_API_KEY` set in `.env.local` for local dev?**
   - CONTEXT.md says "all env vars already in `.env.local`" but `llm-chat.js` shows only OpenRouter/OpenAI keys. The `GOOGLE_API_KEY` is not referenced in any existing code.
   - Recommendation: Verify at Wave 0 before implementing the AI node. If absent, the analyze_opportunity node will fail silently.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `@langchain/langgraph` | LangGraph pipeline | NO — not installed | Install: `npm install @langchain/langgraph` |
| `@langchain/google-genai` | Gemini AI node | NO — not installed | Install: `npm install @langchain/google-genai` |
| `GOOGLE_API_KEY` | ChatGoogleGenerativeAI | UNKNOWN | Referenced in CONTEXT.md env vars list; not verified in `.env.local` |
| `ATTOMDATA_API_KEY` | enrich_property node | ASSUMED present | Referenced in existing `attom.mjs` |
| `NYC_PLUTO_SODA_DATASET_ID` | fetch_zoning_rules / nyc.mjs | ASSUMED present | Referenced in existing `nyc.mjs` |
| `GEMINI_MODEL` | ChatGoogleGenerativeAI | ASSUMED present | CONTEXT.md: `GEMINI_MODEL=gemini-2.5-flash` |
| Node.js 18+ | LangGraph ESM support | ASSUMED | Next.js latest requires Node 18+ |

---

## Validation Architecture

> `workflow.nyquist_validation` not set to false — validation section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None configured (no jest.config, no vitest.config, no test/ dir) |
| Config file | Wave 0 gap — none exists |
| Quick run command | `node --experimental-vm-modules scripts/test-pipeline.mjs` (manual Node script) |
| Full suite | `npm run build` (build is the primary gate) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROP-10 | LangGraph pipeline runs 4 nodes and returns report | Integration | `node scripts/test-pipeline.mjs` | Wave 0 gap |
| PROP-07 | AI returns structured JSON with all required fields | Integration | same script | Wave 0 gap |
| PROP-08-A | Report page renders all fields | Manual/visual | dev server test | Wave 0 gap |
| PROP-08-B | Publish button present | Manual/visual | dev server test | Wave 0 gap |

### Wave 0 Gaps

- [ ] `scripts/test-pipeline.mjs` — integration test: invoke pipeline with real NYC address, assert `report` has `canBuildMore`, `zoningDistrict`, `ownerName` fields
- [ ] Requires `GOOGLE_API_KEY` and `ATTOMDATA_API_KEY` to be set for integration test

*(No unit test framework needed for this phase — build + integration script is sufficient for v1)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in v1 |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Public API in v1 |
| V5 Input Validation | Yes | Validate `address` is a non-empty string before pipeline invocation |
| V6 Cryptography | No | No crypto operations |
| V7 Error Handling | Yes | Never expose `GOOGLE_API_KEY` or `ATTOMDATA_API_KEY` in error responses |

### Known Threat Patterns

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Address injection via API body | Tampering | Validate `address` is string, trim, max 500 chars before sending to pipeline |
| API key leak in error response | Info Disclosure | Catch errors in route handler; return generic `{ error: "Analysis failed" }`, never raw error objects |
| Prompt injection via address field | Tampering | Address string is data context to Gemini, not a system prompt; low risk but sanitize newlines |
| Excessive API costs via unrestricted calls | DoS | No rate limiting in v1 (acceptable for internal tool); flag for v2 |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `lib/open-property/cities/nyc.mjs`, `lib/open-property/attom.mjs`, `lib/open-property/fetch-property-intel.mjs`, `app/api/property/route.js`, `package.json`, `components/site/SiteChrome.jsx`, `components/homeowner-feasibility/FeasibilityChat.jsx`, `lib/llm-chat.js`, `lib/homeowner-feasibility/zoning-knowledge-base.js`, `lib/homeowner-feasibility/zoning-consultant-prompt.js`
- npm registry: `@langchain/langgraph@1.4.2`, `@langchain/google-genai@2.1.31`, `@langchain/core@1.1.49` (verified 2026-06-14)
- Context7 LangGraph JS (`/llmstxt/langchain-ai_github_io_langgraphjs_llms_txt`): StateGraph addNode/addEdge/compile patterns
- Context7 LangChain Google (`/langchain-ai/langchain-google`): withStructuredOutput json_schema method

### Secondary (MEDIUM confidence)
- NYC Open Data columns API (`data.cityofnewyork.us/api/views/64uk-42ks/columns.json`): PLUTO Socrata field names confirmed: `numfloors`, `resarea`, `comarea`, `bldgarea`, `unitsres`, `unitstotal`, `bldgfront`, `lotfront`, `lotdepth`
- [NYC PLUTO and MapPLUTO official page](https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page)
- Community LangGraph JS plain-JS example: `medium.com/@barsegyan96armen`

### Tertiary (LOW confidence — needs validation)
- PLUTO field names `taxclassat`, `proxdescription`, `ext`, `bsmtcode`, `residfar`, `commfar` — documented in older PLUTO data dictionaries; presence in current Socrata table version 26v1 assumed
- `transpilePackages` necessity for LangGraph ESM in Next.js — assumed based on Next.js docs pattern; may not be needed

---

## Metadata

**Confidence breakdown:**
- Installation status: HIGH — verified package.json has no langgraph
- LangGraph JS API (plain JS): MEDIUM — docs are TypeScript-first; plain JS pattern is mechanical but less documented
- @langchain/google-genai structured output: HIGH — official source, clear API
- PLUTO field mapping: HIGH for core fields (`numfloors`, `resarea`, `comarea`, `unitsres`, `unitstotal`, `bldgfront`, `lotfront`, `lotdepth`); LOW for edge fields (`taxclass`, `proxdescription`, `bldgdepth`)
- Enrich endpoint status: HIGH — verified file does not exist
- Reusable assets: HIGH — all files read directly
- Risks/gotchas: HIGH — based on direct codebase inspection and LangGraph known issues

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (PLUTO field names are stable; LangGraph 1.x API is stable for 30+ days)
