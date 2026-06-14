# Phase 2: LangGraph AI Pipeline + Property Report Page — Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/open-property/cities/nyc.mjs` | service/connector | request-response | `lib/open-property/cities/boston.mjs` | exact (same role + data flow) |
| `lib/langgraph/property-pipeline.mjs` | orchestrator/service | batch (multi-step) | `lib/homeowner-feasibility/zoning-knowledge-base.js` (import pattern) + RESEARCH.md spec | role-match (no StateGraph analog exists) |
| `app/api/property/enrich/route.js` | API route | request-response | `app/api/property/route.js` | exact (same role + data flow, thin alias) |
| `app/api/opportunity/analyze/route.js` | API route | request-response | `app/api/property/route.js` | exact (same role + data flow) |
| `app/opportunity-report/page.jsx` | page (client) | request-response | `app/homeowner-feasibility/page.jsx` + `components/homeowner-feasibility/FeasibilityChat.jsx` | role-match (client-side fetch pattern) |
| `components/property/ReportCard.jsx` | component (display) | transform | `components/tokenization/TokenizationPreviewCard.jsx` | role-match (two-column card pattern) |
| `components/property/OpportunityAssessment.jsx` | component (display) | transform | `components/tokenization/TokenizationPreviewCard.jsx` + FeasibilityChat loading pattern | role-match |

---

## Pattern Assignments

### `lib/open-property/cities/nyc.mjs` (service/connector, extend existing)

**Analog:** `lib/open-property/cities/nyc.mjs` (lines 57–115) — the function being extended  
**Reference:** `lib/open-property/cities/boston.mjs` (lines 57–90) — field-extraction + multi-candidate fallback pattern

**Existing function signature to extend** (`nyc.mjs` lines 57–115):
```javascript
export async function nycFetchPlutoByBbl(bbl) {
  // ... env guard, fetch, error handling already in place
  const row = rows?.[0];
  if (!row) { return { ok: false, error: `No PLUTO row for bbl=${bbl}` }; }

  // EXISTING field extraction pattern (lines 86–113):
  const zoningDistrict =
    row.zonedist1 || row.Zonedist1 || row.zonedist || row.ZoneDist1 || row.zone_dist || null;
  const buildingClass =
    row.bldgclass || row.BldgClass || row.bldg_class || row.buildingclass || null;
  const lotArea =
    row.lotarea ?? row.LotArea ?? row.lot_area ?? row.lotArea ?? null;

  return {
    ok: true,
    source: "nyc_open_data_socrata_pluto",
    bbl,
    zoningDistrict,
    buildingClass,
    lotAreaSqFt: lotArea != null ? Number(lotArea) : null,
    useAndOccupancyNote: "PLUTO does not replace a Certificate of Occupancy...",
    rawRowKeys: Object.keys(row),
  };
}
```

**Boston multi-candidate field extraction pattern to copy** (`boston.mjs` lines 57–89):
```javascript
// Pattern: try multiple field name variants, fall through to null
const zoning =
  row.ZONING || row.zoning || row.Zoning || row.ZONE || row.zone || null;
const landUse =
  row.LU_DESC || row.LU || row.lu || row.USE_CODE || row.USECODE || row.land_use || null;
const ownerOccupied =
  row.OWN_OCC || row.own_occ || row.owner_occupied || row.OO || null;

return {
  ok: true,
  source: "boston_ckan_property_assessment",
  matchCount: records.length,
  zoningDistrict: zoning,
  landUseOrOccupancy: landUse,
  ownerOccupied,
  sampleRecord: row,
  fieldNames: fields,
};
```

**Extension target — add these new fields to the return object** (append after `lotAreaSqFt`, before `useAndOccupancyNote`):
```javascript
// New fields — copy the Number(row.field) ?? null pattern from existing lotAreaSqFt line
numFloors:        row.numfloors != null ? Number(row.numfloors) : null,
residentialArea:  row.resarea != null ? Number(row.resarea) : null,
commercialArea:   row.comarea != null ? Number(row.comarea) : null,
totalBuildingArea: row.bldgarea != null ? Number(row.bldgarea) : null,
residentialUnits: row.unitsres != null ? Number(row.unitsres) : null,
totalUnits:       row.unitstotal != null ? Number(row.unitstotal) : null,
buildingFrontage: row.bldgfront != null ? Number(row.bldgfront) : null,
lotFrontage:      row.lotfront != null ? Number(row.lotfront) : null,
lotDepth:         row.lotdepth != null ? Number(row.lotdepth) : null,
yearBuiltPluto:   row.yearbuilt != null ? Number(row.yearbuilt) : null,
numBuildings:     row.numbldgs != null ? Number(row.numbldgs) : null,
block:            row.block || null,
lot:              row.lot || null,
taxClass:         row.taxclassat || row.taxclass || null,
buildingStyle:    row.proxdescription || row.landuse || null,
buildingDepth:    row.bldgdepth || null,
constructionType: row.ext || row.bsmtcode || null,
// FAR fields for zoning analysis (PLUTO Socrata):
residFar:         row.residfar != null ? Number(row.residfar) : null,
commFar:          row.commfar != null ? Number(row.commfar) : null,
```

**Error handling pattern** — already present, copy from lines 75–84 of `nyc.mjs`:
```javascript
const res = await fetch(`${base}?${params}`, { headers });
if (!res.ok) {
  const t = await res.text();
  return { ok: false, error: `Socrata HTTP ${res.status}: ${t}` };
}
const rows = await res.json();
const row = rows?.[0];
if (!row) {
  return { ok: false, error: `No PLUTO row for bbl=${bbl}` };
}
```

---

### `lib/langgraph/property-pipeline.mjs` (orchestrator, batch/multi-step)

**Analog:** No existing StateGraph in codebase. Use RESEARCH.md spec directly.  
**Import reference:** `lib/open-property/fetch-property-intel.mjs` (direct import for enrich_property node — avoids self-HTTP)  
**Zoning knowledge import:** `lib/homeowner-feasibility/zoning-knowledge-base.js`

**Module structure pattern** (copy ESM export style from `nyc.mjs` lines 1–6):
```javascript
// .mjs — ESM only. No require(). Named + default exports allowed.
// Env vars accessed directly via process.env (works in Next.js Node.js runtime)
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchPropertyIntel } from "../open-property/fetch-property-intel.mjs";
import { getZoningKnowledgeBaseJson } from "../homeowner-feasibility/zoning-knowledge-base.js";
```

**StateAnnotation plain-JS pattern** (from RESEARCH.md section 2 — no TypeScript generics):
```javascript
// Bare Annotation = last-write-wins, any type
// Annotation({ reducer, default }) = controlled merge
const PipelineState = Annotation.Root({
  address: Annotation,
  property: Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  zoningRules: Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  aiAssessment: Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  report: Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
});
```

**Node error handling pattern** (mirror `route.js` try/catch, lines 22–53):
```javascript
// Each node: async function, returns partial state update object
// Errors bubble to StateGraph and surface in the API route catch block
async function enrichProperty(state) {
  try {
    const result = await fetchPropertyIntel(state.address);
    return { property: result };
  } catch (e) {
    // Return partial state with error flag — don't throw (kills graph)
    return { property: { ok: false, error: e?.message || "enrich failed" } };
  }
}
```

**Graph build + compile pattern** (from RESEARCH.md section 2):
```javascript
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
```

**Gemini structured output pattern** (from RESEARCH.md section 3 — no Zod, no TypeScript):
```javascript
const model = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

// Plain JSON schema dict — only string/number/boolean/array types (no null unions)
const opportunitySchema = {
  title: "OpportunityAssessment",
  type: "object",
  properties: {
    canBuildMore: { type: "boolean" },
    additionalUnitsEstimate: { type: "number" },
    canAddFloors: { type: "boolean" },
    conversionOpportunity: { type: "string" },
    farUsed: { type: "number" },
    farAllowed: { type: "number" },
    farRemaining: { type: "number" },
    heightLimitStories: { type: "number" },
    currentStories: { type: "number" },
    opportunities: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["canBuildMore", "additionalUnitsEstimate", "canAddFloors",
             "conversionOpportunity", "farUsed", "farAllowed", "farRemaining",
             "opportunities", "summary"],
};

const structuredModel = model.withStructuredOutput(opportunitySchema, {
  name: "OpportunityAssessment",
});
```

**City-tiering pattern for fetch_zoning_rules** (from RESEARCH.md section 9):
```javascript
async function fetchZoningRules(state) {
  const { property } = state;
  const isNYC = property.localRecords?.nyc?.pluto?.ok;
  const isBoston = property.localRecords?.boston?.assessing?.ok;

  if (isNYC) {
    const pluto = property.localRecords.nyc.pluto;
    return {
      zoningRules: {
        source: "nyc_pluto",
        zoningDistrict: pluto.zoningDistrict,
        residFar: pluto.residFar,
        commFar: pluto.commFar,
        rawPluto: pluto,
      }
    };
  }
  if (isBoston) {
    return { zoningRules: { source: "boston_assessing", zoningDistrict: property.zoningDistrict } };
  }
  return {
    zoningRules: {
      source: "gemini_knowledge",
      zoningDistrict: property.zoningDistrict,
      note: "Non-NYC/Boston city: AI will apply general zoning principles",
    }
  };
}
```

---

### `app/api/property/enrich/route.js` (API route, request-response)

**Analog:** `app/api/property/route.js` (lines 1–53) — exact copy with minor differences

**Full pattern to copy** (`app/api/property/route.js` lines 1–53):
```javascript
import { NextResponse } from "next/server";
import { fetchPropertyIntel } from "@/lib/open-property/fetch-property-intel.mjs";
import { CORS_HEADERS } from "@/lib/api-cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const propertyData = await fetchPropertyIntel(address);

    return NextResponse.json(
      { ok: true, property: propertyData },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Property lookup failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
```

**Difference from `/api/property`:** Drop `metroOverride` parameter handling — this is a thin alias that calls `fetchPropertyIntel(address)` with no options. Response shape is identical: `{ ok: true, property: propertyData }`.

---

### `app/api/opportunity/analyze/route.js` (API route, request-response)

**Analog:** `app/api/property/route.js` (lines 1–53)

**Imports pattern** (adapt from `route.js` lines 1–3):
```javascript
import { NextResponse } from "next/server";
import { propertyPipeline } from "@/lib/langgraph/property-pipeline.mjs";
import { CORS_HEADERS } from "@/lib/api-cors";
```

**OPTIONS + CORS pattern** (copy from `route.js` lines 5–7):
```javascript
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
```

**POST handler pattern** (adapt from `route.js` lines 21–53):
```javascript
export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Input validation (from RESEARCH.md security section):
    if (address.length > 500) {
      return NextResponse.json(
        { error: "Address exceeds maximum length." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await propertyPipeline.invoke({ address });

    return NextResponse.json(
      { ok: true, report: result.report },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    // Never expose raw error — could leak API keys in stack trace
    return NextResponse.json(
      { error: "Analysis failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
```

---

### `app/opportunity-report/page.jsx` (page, client component)

**Analog:** `app/homeowner-feasibility/page.jsx` (lines 1–39) — server wrapper pattern  
**Async fetch pattern analog:** `components/homeowner-feasibility/FeasibilityChat.jsx` (lines 35–90) — state + fetch pattern

**Page wrapper pattern** (copy from `homeowner-feasibility/page.jsx` lines 1–39, adapt):
```jsx
// Note: This page must be "use client" (reads useSearchParams)
// The server wrapper exports metadata — use a Suspense boundary instead.
// See RESEARCH.md section 10 for Suspense requirement with useSearchParams.
export const metadata = {
  title: "Opportunity Report · BricksNexus",
  description: "AI-powered property development opportunity analysis.",
};
```

**Client component state pattern** (from `FeasibilityChat.jsx` lines 10–15):
```jsx
"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReportCard from "@/components/property/ReportCard";
import OpportunityAssessment from "@/components/property/OpportunityAssessment";

function OpportunityReportInner() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-slate-500">Loading…</p>}>
      <OpportunityReportInner />
    </Suspense>
  );
}
```

**Fetch + error pattern** (from `FeasibilityChat.jsx` lines 35–90):
```jsx
// Copy this pattern from fetchProperty() in FeasibilityChat:
const handleAnalyze = async (addr) => {
  setError("");
  if (!addr?.trim()) { setError("Enter a street address."); return; }
  setLoading(true);
  try {
    const res = await fetch("/api/opportunity/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");
    setReport(data.report);
    window.history.replaceState({}, "", `?address=${encodeURIComponent(addr.trim())}`);
  } catch (e) {
    setError(e.message || "Something went wrong.");
  } finally {
    setLoading(false);
  }
};
```

**Input + button pattern** (from `FeasibilityChat.jsx` lines 160–185):
```jsx
<input
  type="text"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="305 East 105th Street, New York, NY"
  className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--construction-teal)] focus:ring-1"
  disabled={loading}
/>
<button
  type="button"
  onClick={() => handleAnalyze(address)}
  disabled={loading}
  className="rounded-xl bg-[var(--deep-navy)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
>
  {loading ? "Analyzing…" : "Analyze"}
</button>
```

**Page layout shell** (copy from `homeowner-feasibility/page.jsx` lines 12–38):
```jsx
<main className="token-shell min-h-screen px-4 py-10 md:px-8">
  <div className="mx-auto max-w-5xl">
    {/* address form */}
    {/* two-column report cards */}
    {/* AI assessment panel */}
  </div>
</main>
```

**Auto-run from URL pattern** (from RESEARCH.md section 10):
```jsx
useEffect(() => {
  const urlAddress = searchParams.get("address");
  if (urlAddress && !report) handleAnalyze(urlAddress);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

---

### `components/property/ReportCard.jsx` (component, display/transform)

**Analog:** `components/tokenization/TokenizationPreviewCard.jsx` (lines 15–117) — two-column card with labeled metrics

**Component signature pattern** (from `TokenizationPreviewCard.jsx` line 15):
```jsx
// Receives flat props — no "use client" needed (pure display)
export default function ReportCard({ propertyInfo, landInfo }) {
  // propertyInfo: { address, borough, block, lot, ownerName, ... }
  // landInfo: { landFrontage, landDepth, lotAreaSqFt, zoningDistrict }
}
```

**Two-column grid pattern** (from `TokenizationPreviewCard.jsx` lines 51–64):
```jsx
// Use sm:grid-cols-2 for two-column layout — same pattern as PreviewCard metrics
<div className="grid gap-6 sm:grid-cols-2">
  {/* Left column: Property Information */}
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
      Property Information
    </h2>
    {/* Field rows */}
  </div>
  {/* Right column: Land Information */}
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
      Land Information
    </h2>
    {/* Field rows */}
  </div>
</div>
```

**Labeled field row pattern** (adapt from `TokenizationPreviewCard.jsx` `PreviewMetric` component, lines 100–116):
```jsx
// Internal helper — label + value row for each report field
function FieldRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  );
}
```

**Null/missing value pattern** (from CONTEXT.md spec): Show `"—"` for missing values. Apply at the FieldRow level: `value ?? "—"`.

---

### `components/property/OpportunityAssessment.jsx` (component, display/transform)

**Analog:** `components/tokenization/TokenizationPreviewCard.jsx` (lines 40–96) — card layout with action button  
**Loading/error display analog:** `FeasibilityChat.jsx` (lines 186–220) — loading + error pattern

**Component signature** (no "use client" needed — pure display, receives props):
```jsx
export default function OpportunityAssessment({ assessment }) {
  // assessment: { canBuildMore, additionalUnitsEstimate, canAddFloors,
  //               conversionOpportunity, farUsed, farAllowed, farRemaining,
  //               heightLimitStories, currentStories, opportunities[], summary }
}
```

**Full-width panel wrapper** (adapt from `TokenizationPreviewCard.jsx` lines 40–41):
```jsx
<section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
    <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
      AI Opportunity Assessment
    </h2>
  </div>
  {/* FAR metrics, opportunity bullets, summary, Publish button */}
</section>
```

**Boolean badge pattern** (adapt from `TokenizationPreviewCard.jsx` lines 33–36):
```jsx
// Copy the badge style — swap emerald/blue based on boolean value
<span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
  assessment.canBuildMore ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
}`}>
  {assessment.canBuildMore ? "Can build more units" : "At or near maximum density"}
</span>
```

**Opportunity bullets pattern** (from `FeasibilityChat.jsx` message rendering, lines 196–217 — adapt list style):
```jsx
<ul className="mt-4 space-y-2">
  {(assessment.opportunities || []).map((opp, i) => (
    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
      <span className="mt-0.5 text-emerald-500">&#10003;</span>
      {opp}
    </li>
  ))}
</ul>
```

**Publish button pattern** (from `TokenizationPreviewCard.jsx` lines 80–93):
```jsx
// Phase 3 placeholder — alert on click per CONTEXT.md
<button
  type="button"
  onClick={() => alert("Coming soon — marketplace launches in Phase 3.")}
  className="rounded-2xl bg-[var(--deep-navy)] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
>
  Publish to Marketplace
</button>
```

**Loading/error display pattern** (from `FeasibilityChat.jsx` lines 186–190):
```jsx
// In page.jsx — show before rendering OpportunityAssessment:
{error && <p className="mt-4 text-sm text-red-600">{error}</p>}
{loading && <p className="mt-4 text-sm text-slate-500">Analyzing property…</p>}
```

---

## Shared Patterns

### CORS + OPTIONS Handler
**Source:** `lib/api-cors.js` (lines 1–6) + `app/api/property/route.js` (lines 5–7)  
**Apply to:** `app/api/property/enrich/route.js`, `app/api/opportunity/analyze/route.js`
```javascript
import { CORS_HEADERS } from "@/lib/api-cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
// Every NextResponse.json() call passes { headers: CORS_HEADERS } as 2nd arg options object
```

### API Route Error Handling
**Source:** `app/api/property/route.js` (lines 47–52)  
**Apply to:** Both new API routes
```javascript
// Return generic message — never expose raw error (could leak API keys)
} catch (e) {
  return NextResponse.json(
    { error: e?.message || "Operation failed." },
    { status: 500, headers: CORS_HEADERS }
  );
}
```
**Exception for `analyze/route.js`:** Use generic `"Analysis failed."` (not `e?.message`) because pipeline errors may contain `GOOGLE_API_KEY` in traces.

### Client Component Fetch State
**Source:** `components/homeowner-feasibility/FeasibilityChat.jsx` (lines 10–15)  
**Apply to:** `app/opportunity-report/page.jsx`
```jsx
const [address, setAddress] = useState("");
const [report, setReport] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
```

### ESM Module Pattern (`.mjs` files)
**Source:** `lib/open-property/cities/nyc.mjs` (lines 1–5) and `lib/open-property/cities/boston.mjs` (lines 1–5)  
**Apply to:** `lib/langgraph/property-pipeline.mjs`
```javascript
// No "use strict" needed — ESM is strict by default
// No module.exports — use named exports only
// process.env.VAR_NAME works directly (Next.js Node.js runtime)
export async function someFunction() { ... }
export const someExport = compiledThing;
```

### Multi-Candidate Field Extraction
**Source:** `lib/open-property/cities/boston.mjs` (lines 57–80) and `lib/open-property/cities/nyc.mjs` (lines 86–103)  
**Apply to:** `lib/open-property/cities/nyc.mjs` extension (new PLUTO fields)
```javascript
// Pattern: try several field name variants (case variants + underscore variants), fall to null
const fieldValue =
  row.FIELD_NAME || row.field_name || row.FieldName || row.fieldname || null;
// For numeric fields: guard with != null before Number() conversion
const numericField = row.numericfield != null ? Number(row.numericfield) : null;
```

### Tailwind Card Shell
**Source:** `components/tokenization/TokenizationPreviewCard.jsx` (lines 40–41)  
**Apply to:** `components/property/ReportCard.jsx`, `components/property/OpportunityAssessment.jsx`
```jsx
// Standard card: rounded-2xl + border + bg-white + shadow
<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
```

### SiteChrome NAV Array (modify, not create)
**Source:** `components/site/SiteChrome.jsx` (lines 6–11)  
**Apply to:** `components/site/SiteChrome.jsx` — add one entry
```javascript
const NAV = [
  { href: "/", label: "Marketplace" },
  { href: "/about", label: "About" },
  { href: "/tokenization", label: "Tokenization" },
  { href: "/homeowner-feasibility", label: "Feasibility" },
  { href: "/opportunity-report", label: "Opportunity Report" }, // ADD THIS
];
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/langgraph/property-pipeline.mjs` (StateGraph core) | orchestrator | batch/multi-step | No LangGraph or multi-step pipeline exists in codebase. Use RESEARCH.md section 2 spec directly. |

---

## Metadata

**Analog search scope:** `app/api/`, `app/**/page.jsx`, `components/**/*.jsx`, `lib/open-property/cities/`, `lib/homeowner-feasibility/`, `lib/api-cors.js`, `lib/llm-chat.js`, `app/layout.jsx`  
**Files scanned:** 15  
**Pattern extraction date:** 2026-06-14
