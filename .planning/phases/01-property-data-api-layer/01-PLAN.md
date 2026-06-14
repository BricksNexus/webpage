---
phase: 1
plan: 1
wave: 1
title: Verify and finalize Property Data API Layer
objective: Confirm the existing /api/property endpoint delivers all required enrichment fields (owner, block/lot, zoning, use/occupancy, validated address) and the build passes clean.
depends_on: []
files_modified:
  - app/api/property/route.js
  - lib/open-property/attom.mjs
  - lib/open-property/fetch-property-intel.mjs
autonomous: true
requirements:
  - PROP-01
  - PROP-02
  - PROP-03
  - PROP-04
  - PROP-05
  - PROP-06
must_haves:
  goal: POST /api/property returns all required enrichment fields for a real address
  truths:
    - POST /api/property accepts { address } and returns { ok, property } JSON
    - property.ownerName is populated from AttomData when ATTOMDATA_API_KEY is set
    - property.blockLot is populated (e.g. "Block 12 / Lot 45") from AttomData
    - property.streetLine (validated address) is present from Census geocoder
    - property.zoningDistrict is present (from NYC PLUTO for NYC addresses, or OSM tags)
    - property.useAndOccupancy is present from AttomData or Boston connector
    - npm run build exits 0 with no errors
---

# Phase 1 — Plan 1: Verify and Finalize Property Data API Layer

## Context

The existing codebase already has a nearly complete implementation:
- `lib/open-property/attom.mjs` — AttomData client (owner, block/lot, use/occupancy, assessed value)
- `lib/open-property/fetch-property-intel.mjs` — merges AttomData + Census + OSM + NYC PLUTO + Boston into a single object
- `app/api/property/route.js` — `POST /api/property` calls `fetchPropertyIntel` and returns the result

This plan verifies the existing implementation satisfies all Phase 1 requirements and fixes any gaps.

## Wave 1 — Verification and Gap Fix

### Task 1.1: Test the existing POST /api/property endpoint

<read_first>
- app/api/property/route.js
- lib/open-property/attom.mjs
- lib/open-property/fetch-property-intel.mjs
</read_first>

<action>
Run a local test of the endpoint with a real NYC address to confirm all required fields are present in the response.

Start dev server: `npm run dev`
Then POST to http://localhost:3000/api/property with body:
```json
{ "address": "120 Broadway, New York, NY 10271" }
```

Verify the response includes:
- `property.ownerName` — non-null string (owner name from AttomData)
- `property.blockLot` — non-null string like "Block 12 / Lot 45"
- `property.streetLine` — normalized/validated address string
- `property.zoningDistrict` — zoning district code (e.g. "C5-3")
- `property.useAndOccupancy` — use/occupancy description
- `property.attomData.assessedValue` — assessed value number or null

If any required field is null due to an API issue, check:
1. `ATTOMDATA_API_KEY` is set in `.env.local`
2. AttomData address splitting in `splitAddressForAttom()` produces correct `street` and `cityStateZip`
3. NYC PLUTO connector is being triggered (metro should resolve to "nyc")
</action>

<acceptance_criteria>
- `POST /api/property` with address "120 Broadway, New York, NY 10271" returns HTTP 200
- Response JSON contains `ok: true`
- `property.ownerName` field exists in response (may be null if property not found but field must exist)
- `property.blockLot` field exists in response
- `property.streetLine` is a non-empty string
- `property.zoningDistrict` is non-null for NYC addresses
- `property.useAndOccupancy` is a non-empty string
</acceptance_criteria>

---

### Task 1.2: Add /api/property/enrich alias route

<read_first>
- app/api/property/route.js
- lib/api-cors.js
</read_first>

<action>
Create `app/api/property/enrich/route.js` as a thin alias to the existing `/api/property` handler. This route is referenced by Phase 2's LangGraph pipeline and the ROADMAP spec.

Create the file at `app/api/property/enrich/route.js`:

```js
/**
 * POST /api/property/enrich
 * Alias for /api/property — unified property enrichment endpoint.
 * Accepts: { address: string, metroOverride?: "nyc" | "boston" | "generic" }
 * Returns: { ok: true, property: { ownerName, blockLot, streetLine, zoningDistrict, useAndOccupancy, attomData, ... } }
 */
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
    const metroOverride = body?.metroOverride;

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const property = await fetchPropertyIntel(address, {
      metroOverride:
        metroOverride === "nyc" || metroOverride === "boston"
          ? metroOverride
          : metroOverride === "generic"
            ? "generic"
            : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        property: {
          ownerName: property.ownerName ?? null,
          blockLot: property.blockLot ?? null,
          validatedAddress: property.streetLine ?? null,
          zoningDistrict: property.zoningDistrict ?? null,
          zoningConfidence: property.derivedSummary?.zoningConfidence ?? null,
          useAndOccupancy: property.useAndOccupancy ?? null,
          lotAreaSqFt: property.lotAreaSqFt ?? null,
          assessedValue: property.attomData?.assessedValue ?? null,
          yearBuilt: property.attomData?.yearBuilt ?? null,
          buildingSqFt: property.attomData?.buildingSqFt ?? null,
          city: property.city ?? null,
          region: property.region ?? null,
          geocode: property.geocode ?? null,
          localRecords: property.localRecords ?? null,
          dataQuality: property.dataQuality ?? null,
          limitations: property.limitations ?? [],
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Property enrichment failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
```

Note: This returns a cleaner, flat response shape compared to the raw `/api/property` response. Phase 2 (LangGraph pipeline) will call `/api/property/enrich`.
</action>

<acceptance_criteria>
- File `app/api/property/enrich/route.js` exists
- File exports `OPTIONS` and `POST` functions
- `POST /api/property/enrich` with `{ address: "120 Broadway, New York, NY 10271" }` returns HTTP 200
- Response contains `property.ownerName`, `property.blockLot`, `property.validatedAddress`, `property.zoningDistrict`, `property.useAndOccupancy` keys
- grep "export async function POST" app/api/property/enrich/route.js exits 0
</acceptance_criteria>

---

### Task 1.3: Run build and verify no errors

<read_first>
- package.json
</read_first>

<action>
Run the Next.js production build to confirm no errors:

```bash
npm run build
```

If build fails:
1. Check for missing imports or module resolution errors in the new `enrich/route.js`
2. Ensure `@/lib/open-property/fetch-property-intel.mjs` resolves correctly (check `jsconfig.json` for path aliases)
3. Fix any linting or syntax errors reported

Do NOT proceed until build exits 0.
</action>

<acceptance_criteria>
- `npm run build` exits with code 0
- No "Module not found" errors in build output
- No syntax errors reported
- Build output shows `app/api/property/enrich` as a generated route
</acceptance_criteria>

---

## Verification

Phase 1 is complete when:
1. `POST /api/property/enrich` returns HTTP 200 with all required enrichment fields
2. `POST /api/property` (existing) continues to work unchanged
3. `npm run build` exits 0
4. All Phase 1 requirements (PROP-01 through PROP-06) are satisfied by the enrichment endpoint

## Notes

- The existing `attom.mjs` and `fetch-property-intel.mjs` are already wired correctly — **do not rewrite them**
- The `/api/property/enrich` route is intentionally a clean alias with a flatter response shape for Phase 2 consumption
- AttomData returns null fields gracefully when a property is not found; this is expected behavior
