---
phase: 01-property-data-api-layer
verified: 2026-06-14T19:20:00Z
status: human_needed
score: 6/6 must-haves verified (code-path + build); 2 require live-runtime human confirmation
overrides_applied: 0
warnings:
  - id: WR-01
    summary: "Corporate/entity owner names always resolve to null (dead branch in formatOwnerName)"
    file: lib/open-property/attom.mjs:65-73
    severity: warning
    impact: "ownerName field exists and is wired, and individual-owner data flows correctly, but corporate-owned parcels (LLC/INC) silently return null even when AttomData returns a name. Degrades PROP-02 for commercial parcels."
human_verification:
  - test: "POST /api/property/enrich with a real residential US address that has an individual owner (e.g. a single-family home) while ATTOMDATA_API_KEY is set."
    expected: "HTTP 200, ok: true, property.ownerName is a non-null 'Lastname, Firstname' string, property.blockLot present, property.assessedValue present."
    why_human: "Requires a live AttomData API call (network + valid key). Endpoint code path and response allow-list verified by inspection; live data flow cannot be asserted without a real request."
  - test: "POST /api/property/enrich with a corporate-owned parcel (e.g. an LLC-owned commercial address)."
    expected: "Decision point: confirm whether property.ownerName returns the corporate entity name or null. Per WR-01, current code returns null for corporate owners."
    why_human: "Confirms the real-world severity of WR-01 against live AttomData payloads and whether corporate owners are in-scope for PROP-02."
  - test: "POST /api/property/enrich with a NYC address (e.g. '120 Broadway, New York, NY 10271') with NYC_GEOCLIENT_APP_ID, NYC_GEOCLIENT_APP_KEY and NYC_PLUTO_SODA_DATASET_ID set in .env.local."
    expected: "property.zoningDistrict resolves to a real PLUTO zoning code (e.g. 'C5-3') with zoningConfidence 'official_local_open_data'."
    why_human: "NYC PLUTO connector code path is present and wired, but the required NYC Geoclient / PLUTO dataset credentials are NOT set in .env.local. Live PLUTO zoning (ROADMAP SC-3) cannot be confirmed in this environment; without creds it falls back to OSM/placeholder."
---

# Phase 1: Property Data API Layer — Verification Report

**Phase Goal:** Wire AttomData and existing open-property pipeline into a unified `/api/property/enrich` endpoint that returns owner, block/lot, zoning, use/occupancy, and validated address for any US address.
**Verified:** 2026-06-14T19:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Truths are merged from ROADMAP Success Criteria (the contract) and PLAN frontmatter must_haves. Where the PLAN must_haves referenced `/api/property` + `streetLine`, the ROADMAP contract wording (`/api/property/enrich` + `validatedAddress`) takes precedence and was verified against the actual route.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | POST /api/property/enrich accepts `{ address }` and returns JSON with `ownerName`, `blockLot`, `validatedAddress`, `zoningDistrict`, `useAndOccupancy`, `assessedValue` present | ✓ VERIFIED | `app/api/property/enrich/route.js:41-48` — all six keys present, each `?? null` graceful default. grep confirmed all six field names. |
| 2 | `app/api/property/enrich/route.js` exists and exports OPTIONS + POST | ✓ VERIFIED | File exists (67 lines). `export async function OPTIONS` (line 11), `export async function POST` (line 15). |
| 3 | AttomData `/property/basicprofile` is called and owner + block/lot flow to the response | ⚠ VERIFIED (with WARNING) | `attom.mjs:14-63` calls `…/property/basicprofile`; imported (`fetch-property-intel.mjs:19`), called (line 224), results flow to `derivedSummary.ownerName`/`blockLot` (lines 84-90) → `intel.ownerName`/`blockLot` (288-289) → route response. Live call needs key (human). WARNING WR-01: corporate owner names return null. |
| 4 | Census geocoder validates and normalizes the input address (→ `validatedAddress`) | ✓ VERIFIED | `geocode.mjs:26-55` Census one-line geocoder sets `normalized = matchedAddress`; `fetch-property-intel.mjs:285` `intel.streetLine = geocode.normalized`; route maps `validatedAddress: property.streetLine` (route.js:43). |
| 5 | NYC PLUTO zoning + Census validation present in `fetch-property-intel.mjs` | ✓ VERIFIED (code path) | NYC PLUTO: `fetchNycRecords` imported (line 17), called (line 214); `nycFetchPlutoByBbl` extracts `zoningDistrict` (`cities/nyc.mjs:86-92`), flows to `derivedSummary.zoningDistrict` (lines 33-37). Census wired (line 196). Live PLUTO data needs NYC creds — see human verification. |
| 6 | `npm run build` exits 0 with `/api/property/enrich` appearing as a generated route | ✓ VERIFIED | Ran `npm run build` — exit code 0. Output lists `ƒ /api/property/enrich` as a dynamic route. Compiled in 8.5s, TypeScript/JSX check passed. |

**Score:** 6/6 truths verified at the code-path + build level. Truths 3 and 5 carry runtime human-verification items (live AttomData data, live NYC PLUTO data) and truth 3 carries warning WR-01.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `app/api/property/enrich/route.js` | OPTIONS + POST, flat response with 6 fields | ✓ VERIFIED | Exists, 67 lines, exports both handlers, explicit allow-list response, CORS via `lib/api-cors.js`. Wired into Next.js route table (build shows it). |
| `lib/open-property/attom.mjs` | AttomData client: owner, block/lot, use/occupancy, assessed value | ✓ VERIFIED (WR-01) | Exists, 94 lines, `fetchAttomProperty` exported (Node import confirmed). Calls `basicprofile`, graceful `emptyResult` on all error paths. WR-01: `formatOwnerName` corporate branch is dead. |
| `lib/open-property/fetch-property-intel.mjs` | Merge AttomData + Census + OSM + NYC PLUTO + Boston | ✓ VERIFIED | Exists, 293 lines, `fetchPropertyIntel` exported (Node import confirmed). Orchestrates all layers; flattens owner/blockLot/streetLine/zoningDistrict/useAndOccupancy/attomData. |
| `lib/open-property/cities/nyc.mjs` | PLUTO zoning connector | ✓ VERIFIED | Exists, `fetchNycRecords` → Geoclient BBL → PLUTO `zonedist1`. Wired into pipeline. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| enrich/route.js | fetchPropertyIntel | `import` + `await fetchPropertyIntel(address, …)` | ✓ WIRED | route.js:8 import, line 28 call, response mapped from result. |
| fetch-property-intel.mjs | attom.mjs | `import` + `fetchAttomProperty(parts.street, parts.cityStateZip)` | ✓ WIRED | line 19 import, line 224 call (gated on US + `ATTOMDATA_API_KEY`), result merged in `buildDerivedSummary`. |
| fetch-property-intel.mjs | cities/nyc.mjs (PLUTO) | `import` + `fetchNycRecords(geocode.normalized)` | ✓ WIRED | line 17 import, line 214 call (metro === 'nyc'); zoning extracted lines 33-37. |
| fetch-property-intel.mjs | census-geographies + geocode (Census) | `import` + `geocodeAddress` / `fetchCensusGeographies` | ✓ WIRED | geocode line 167; census line 196; `normalized` → `streetLine` line 285. |
| enrich/route.js | lib/api-cors.js | `import { CORS_HEADERS }` on OPTIONS + responses | ✓ WIRED | route.js:9; used on all responses incl. 204 preflight. |
| Phase 2 consumer | /api/property/enrich | (forward link) | ◻ FORWARD | Not yet consumed by any code — expected. ROADMAP marks enrich as consumed by 02-langgraph-pipeline. Not a Phase 1 gap. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| enrich/route.js → `ownerName` | `property.ownerName` | attom.mjs `formatOwnerName(owner)` | Individual owners: yes. Corporate owners: NO (always null) | ⚠ PARTIAL (WR-01) |
| enrich/route.js → `validatedAddress` | `property.streetLine` | geocode.mjs `geocode.normalized` (Census/Mapbox/Google) | Yes — set on every geocode path | ✓ FLOWING |
| enrich/route.js → `blockLot` | `property.blockLot` | attom.mjs `block`/`lot` → joined string | Yes when AttomData returns lot.block/lot | ✓ FLOWING (needs live key) |
| enrich/route.js → `zoningDistrict` | `property.zoningDistrict` | PLUTO `zonedist1` (or OSM fallback) | PLUTO requires NYC creds (not set in .env.local) → falls back to OSM/placeholder | ⚠ STATIC w/o creds — human verify |
| enrich/route.js → `assessedValue` | `property.attomData?.assessedValue` | attom.mjs `assessment.assessed.assdttlvalue` | Yes when AttomData returns assessment (needs live key) | ✓ FLOWING (needs live key) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Build compiles & route generated | `npm run build` | exit 0; `ƒ /api/property/enrich` listed | ✓ PASS |
| Pipeline module exports function | `node -e import('fetch-property-intel.mjs')` | `fetchPropertyIntel type: function` | ✓ PASS |
| AttomData client exports function | `node -e import('attom.mjs')` | `fetchAttomProperty type: function` | ✓ PASS |
| Owner name — individual | Eval `formatOwnerName({owner1:{lastname:'Smith',firstname:'John'}})` | `"Smith, John"` | ✓ PASS |
| Owner name — corporate | Eval `formatOwnerName({corporateindicator:'Y', companyname:'ACME HOLDINGS INC', owner1:{}})` | `null` (and `""` when name in `owner1.name`) | ✗ FAIL (confirms WR-01) |
| Live enrich HTTP call (real owner data) | n/a — requires running server + live AttomData key | not run | ? SKIP → human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| PROP-01 | 01-PLAN | Address input triggers property analysis | ✓ SATISFIED | POST accepts `{ address }`, validates non-empty (route.js:18-26), invokes pipeline. |
| PROP-02 | 01-PLAN | Owner name from AttomData | ⚠ PARTIAL | Wired and works for individual owners; corporate owners return null (WR-01). Field exists in response. |
| PROP-03 | 01-PLAN | Block & lot from AttomData | ✓ SATISFIED | `attom.mjs:51-52` block/lot → `blockLot` "Block X / Lot Y" string (fetch-property-intel.mjs:85-90). Live key needed for data. |
| PROP-04 | 01-PLAN | Address validation via Census geocoder | ✓ SATISFIED | Census one-line geocoder normalizes → `validatedAddress`. |
| PROP-05 | 01-PLAN | Zoning from NYC PLUTO | ✓ SATISFIED (code) | PLUTO connector wired; `zoningDistrict` + `lotAreaSqFt` extracted. Live PLUTO needs NYC creds (human). |
| PROP-06 | 01-PLAN | Use & occupancy + assessed value from AttomData | ✓ SATISFIED | `useOccupancy` (propsubtype/proptype) + `assessedValue` extracted and surfaced (`useAndOccupancy`, `assessedValue` fields). |

No orphaned requirements: REQUIREMENTS.md maps exactly PROP-01..PROP-06 to Phase 1, all six declared in PLAN frontmatter. (REQUIREMENTS.md traceability table still shows "Pending" status text — a documentation-status field, not an implementation gap; recommend updating to Satisfied/Done on phase close.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| lib/open-property/attom.mjs | 65-73 | Dead/inert conditional branch (`formatOwnerName` corporate arm returns the same empty `lastname`) | ⚠️ Warning | Corporate/entity owner names always null — partially defeats PROP-02 for commercial parcels. Field still exists; graceful null. |
| app/api/property/enrich/route.js | 61-66 | Raw exception/upstream error text echoed to client (`e?.message`) | ⚠️ Warning | Information-disclosure path (per REVIEW WR-02). CORS is `*`. Not goal-blocking. |
| lib/open-property/fetch-property-intel.mjs | 110 | `attom.lotSizeSqFt` fallback not gated on `attom.ok` (per REVIEW WR-03) | ℹ️ Info | Latent only; `emptyResult` returns null today. No current impact. |
| lib/open-property/fetch-property-intel.mjs | 282-284 | `geocode.context` dereferenced without optional chaining (per REVIEW WR-04) | ℹ️ Info | Robustness gap at a reused contract boundary; holds for all current geocode paths. |

No TODO/FIXME/PLACEHOLDER/"not implemented" markers found in any phase file. No stub returns (no `return null`/`return []` standing in for real logic). All fields are real allow-list projections of a populated pipeline object.

### Human Verification Required

The verification focus explicitly designates "live address returns real owner data" as a human item (runtime API-key + network dependency). Two of the three items below stem from credentials/network, the third confirms the WR-01 severity.

1. **Live enrich — individual owner.** POST `/api/property/enrich` with a real US residential address while `ATTOMDATA_API_KEY` is set.
   - Expected: HTTP 200, `ok: true`, `property.ownerName` = non-null "Lastname, Firstname", `property.blockLot` present, `property.assessedValue` present.
   - Why human: live AttomData network call cannot be asserted statically; code path and response allow-list verified by inspection.

2. **Live enrich — corporate owner (confirms WR-01 severity).** POST with an LLC/INC-owned commercial parcel.
   - Expected/Decision: Confirm whether `property.ownerName` should return the corporate entity name. Current code returns null for corporate owners — decide whether to fix WR-01 (in-scope for PROP-02) or accept via override.

3. **Live NYC PLUTO zoning.** POST with a NYC address after setting `NYC_GEOCLIENT_APP_ID`, `NYC_GEOCLIENT_APP_KEY`, `NYC_PLUTO_SODA_DATASET_ID` in `.env.local`.
   - Expected: `property.zoningDistrict` = real PLUTO code (e.g. "C5-3"), `zoningConfidence` = "official_local_open_data".
   - Why human: NYC PLUTO credentials are not present in this environment, so live PLUTO data (ROADMAP SC-3) cannot be confirmed. Code path is present and wired.

### Gaps Summary

No goal-blocking gaps. The unified `POST /api/property/enrich` endpoint exists, exports OPTIONS + POST, and returns a flat response containing all six contract fields (`ownerName`, `blockLot`, `validatedAddress`, `zoningDistrict`, `useAndOccupancy`, `assessedValue`) with graceful null defaults. The AttomData client, Census geocoder, and NYC PLUTO connector are all imported, called, and their outputs traced into the response object. `npm run build` exits 0 and the route appears as a generated dynamic route. All three SUMMARY commits (dd098f4, 0793c04, 64d5fe5) exist.

Two items require human confirmation because they depend on live external services/credentials not exercisable in this environment: (a) real AttomData owner/assessed data with a valid key, and (b) live NYC PLUTO zoning, which additionally requires NYC Geoclient/PLUTO credentials that are absent from `.env.local`. Per the verification focus these are human-verification items, not automated failures — which is why overall status is `human_needed` rather than `passed`.

One real WARNING (WR-01): `formatOwnerName` in `attom.mjs` has a dead corporate-owner branch, so corporate/entity-owned parcels (LLC/INC) always yield `ownerName: null` even when AttomData returns a name. This was proven by a behavioral spot-check. It partially degrades PROP-02 for commercial parcels but does not remove the field or break the pipeline (graceful null was declared acceptable). Recommend fixing before relying on the endpoint for commercial parcels, or accepting via override if corporate owners are out of scope for v1.

---

_Verified: 2026-06-14T19:20:00Z_
_Verifier: Claude (gsd-verifier)_
