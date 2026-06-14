---
phase: 01-property-data-api-layer
reviewed: 2026-06-14T18:53:42Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - app/api/property/enrich/route.js
  - lib/open-property/attom.mjs
  - lib/open-property/fetch-property-intel.mjs
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-14T18:53:42Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the new `POST /api/property/enrich` alias route and the two largely
pre-existing AttomData / property-intel library modules. The enrich route is a
thin, well-scoped wrapper that mirrors the existing `/api/property` route and
validates its single required input correctly. No critical security defects
(injection, SSRF, secret leakage) were found: outbound query parameters in
`attom.mjs` are constructed via `URLSearchParams` (URL-encoded), the API key is
sent only as a header, and the enrich route returns an explicit allow-list of
fields rather than the raw intel object.

The findings below are genuine correctness/robustness defects rather than style
nits. The most consequential is a logic bug in `formatOwnerName` that causes
corporate-owned properties to always return a `null` owner name — directly
defeating one of the enrich endpoint's advertised outputs. There is also a
client-facing error-message leakage path and a missing field-shape guard worth
addressing.

Per the phase brief, the `.mjs` files were not rewritten; bugs in them are
flagged but scoped narrowly.

## Warnings

### WR-01: Corporate owner names never returned (dead logic branch)

**File:** `lib/open-property/attom.mjs:65-73`
**Issue:** `formatOwnerName` is meant to produce an owner name including the
corporate case. The corporate branch is unreachable/inert: the function only
enters the `corporateindicator === "Y"` branch when `owner.owner1?.lastname` is
**falsy**, but that branch then returns `owner.owner1?.lastname ?? null` — i.e.
the same falsy `lastname`, which is always `null`/empty. Result: every
corporate-owned property yields `ownerName: null`, even when the API returned a
corporate name. Since `ownerName` is a headline field of the `/enrich` response
(`route.js:41`), this silently degrades the endpoint's primary value for a large
class of commercial parcels.
**Fix:** Read the actual corporate/company name field from the AttomData owner
payload instead of re-reading the empty `lastname`:
```js
function formatOwnerName(owner) {
  if (!owner) return null;
  const o1 = owner.owner1 || {};
  if (o1.lastname) {
    return o1.firstname ? `${o1.lastname}, ${o1.firstname}` : o1.lastname;
  }
  if (owner.corporateindicator === "Y") {
    // AttomData exposes the corporate/entity name in name fields, not lastname
    return o1.name || owner.companyname || o1.fullname || null;
  }
  return null;
}
```
(Confirm the exact corporate name field against the AttomData `basicprofile`
schema; `owner.owner1.lastname` is demonstrably not it for entities.)

### WR-02: Provider error text leaked to API client

**File:** `app/api/property/enrich/route.js:61-66` (via `lib/open-property/geocode.mjs:177-179, 219, 221-224`)
**Issue:** The catch block returns `e?.message` verbatim to the HTTP client.
For the Mapbox path, the thrown message embeds the full upstream response body
(`throw new Error(\`Mapbox geocode failed: ${res.status} ${t}\`)` where
`t = await res.text()`), and the Google path embeds `data.error_message`. These
upstream bodies can contain quota/billing details, internal request IDs, or
account hints, which are then surfaced to any caller (CORS is `*`,
`api-cors.js:3`). This is an information-disclosure path, not just noise.
**Fix:** Log full detail server-side; return a generic message to the client.
```js
} catch (e) {
  console.error("[/api/property/enrich]", e);
  return NextResponse.json(
    { error: "Property enrichment failed." },
    { status: 500, headers: CORS_HEADERS }
  );
}
```
Keep specific 4xx messages (e.g. the missing-address 400) but do not echo raw
upstream/exception text on the 500 path.

### WR-03: `attom.lotSizeSqFt` fallback ignores `attom.ok`

**File:** `lib/open-property/fetch-property-intel.mjs:110`
**Issue:** `lotAreaSqFt: lotAreaSqFt ?? attom?.lotSizeSqFt ?? null`. Every other
consumer of `attom` in `buildDerivedSummary` is correctly gated on `attom?.ok`
(lines 84-86, 93, 96, 115). This line is not. On the AttomData failure paths
(`emptyResult`), `lotSizeSqFt` is `null`, so today the bug is latent — but the
inconsistency means any future change that makes `emptyResult` return a
non-null/sentinel `lotSizeSqFt`, or a partial success shape, would surface
unverified lot area as if it were valid local-record data. It also reads as a
correctness contradiction with the surrounding gated code.
**Fix:** Gate on `ok` like the sibling fields:
```js
lotAreaSqFt: lotAreaSqFt ?? (attom?.ok ? attom.lotSizeSqFt : null) ?? null,
```

### WR-04: `geocode.context` assumed always present — unguarded access

**File:** `lib/open-property/fetch-property-intel.mjs:282-285` (and `223`, `geocode.mjs:269, 281-282`)
**Issue:** `intel.city = geocode.context.city || ...` and
`intel.region = geocode.context.region || null` dereference
`geocode.context` without optional chaining. Today every `geocodeAddress`
return path constructs a `context` object, so this holds — but the function is
exported and reused (`geocode.mjs` is consumed by `scripts/` per CLAUDE.md), and
`isLikelyUnitedStates`/`inferMetroFromGeocode` already use the safer
`geo.context.country` form inconsistently with their own `geo?.context?.region`
guards (`geocode.mjs:273`). A single geocoder branch that returns `{ ... }`
without `context` (e.g. a future provider or a partial mock in tests) would
throw a `TypeError: Cannot read properties of undefined`, which then propagates
to the client as a 500 via the catch. This is a robustness gap at a contract
boundary.
**Fix:** Use optional chaining consistently at the contract boundary:
```js
intel.city =
  geocode.context?.city ||
  (layers.census?.ok ? layers.census.incorporatedPlace : null);
intel.region = geocode.context?.region || null;
```
and in `splitAddressForAttom` the call site already passes `geocode.context`
into a function that guards with `context?.` — keep that pattern everywhere.

## Info

### IN-01: Duplicated route logic between `/api/property` and `/api/property/enrich`

**File:** `app/api/property/enrich/route.js:15-67` (duplicates `app/api/property/route.js:21-53`)
**Issue:** The two routes share identical body parsing, the same
`metroOverride` allow-list ternary, identical CORS/OPTIONS handling, and the
same try/catch shape. The only real difference is the response projection. Drift
between the two (e.g. WR-02's error-leak fix) will now have to be applied twice
and can silently diverge.
**Fix:** Extract a shared helper, e.g.
`lib/open-property/handle-property-request.js`, that does parse → validate →
`fetchPropertyIntel` → returns the intel object, and let each route apply its
own response shape. Keeps the enrich route a true thin alias.

### IN-02: `metroOverride` normalization ternary is redundant

**File:** `app/api/property/enrich/route.js:29-34`
**Issue:** The nested ternary
`metroOverride === "nyc" || "boston" ? metroOverride : === "generic" ? "generic" : undefined`
collapses to "pass the value through if it is one of the three known strings,
else undefined." The `"generic" ? "generic"` arm restates the input. This is
harder to read than the equivalent allow-list and is duplicated verbatim from
the sibling route.
**Fix:**
```js
const allowed = new Set(["nyc", "boston", "generic"]);
const metro = allowed.has(metroOverride) ? metroOverride : undefined;
```

### IN-03: `useOccupancy !== propertyType` comparison can be misleading for partial data

**File:** `lib/open-property/fetch-property-intel.mjs:96-98`
**Issue:** `attom.useOccupancy !== attom.propertyType` is used to decide whether
to append a `Property type:` hint. When `useOccupancy` is `null` and
`propertyType` is set, the condition is true and a "Property type: X" line is
appended even though there is no use/occupancy context — harmless but can read
oddly in the derived summary, and it appends `propertyType` even when
`useParts.length` already received the same value via line 93's `propsubtype`
fallback (since `useOccupancy` derives from `propsubtype ?? proptype`). Worth a
quick guard for clarity.
**Fix:** Only append the property-type hint when it adds new information:
```js
if (attom?.ok && attom.propertyType &&
    attom.propertyType !== attom.useOccupancy) {
  useParts.push(`Property type: ${attom.propertyType}`);
}
```
(Functionally similar; the intent is to document that the null-vs-value case is
deliberate, or to suppress it.)

---

_Reviewed: 2026-06-14T18:53:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
