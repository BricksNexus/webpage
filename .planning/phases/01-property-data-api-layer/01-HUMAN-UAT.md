---
status: partial
phase: 01-property-data-api-layer
source: [01-VERIFICATION.md]
started: 2026-06-14T19:21:00Z
updated: 2026-06-14T19:21:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live enrich — individual owner
expected: POST /api/property/enrich with a real US residential address (individual owner) while ATTOMDATA_API_KEY is set returns HTTP 200, ok: true, property.ownerName = non-null "Lastname, Firstname", property.blockLot present, property.assessedValue present.
result: [pending]

### 2. Live enrich — corporate owner (confirms WR-01 severity)
expected: POST /api/property/enrich with an LLC/INC-owned commercial parcel. Decision point — confirm whether property.ownerName should return the corporate entity name. Current code (attom.mjs formatOwnerName, WR-01) returns null for corporate owners. Decide: fix WR-01 (in-scope for PROP-02) or accept via override.
result: [pending]

### 3. Live NYC PLUTO zoning
expected: POST /api/property/enrich with a NYC address (e.g. "120 Broadway, New York, NY 10271") after setting NYC_GEOCLIENT_APP_ID, NYC_GEOCLIENT_APP_KEY, NYC_PLUTO_SODA_DATASET_ID in .env.local returns property.zoningDistrict = real PLUTO code (e.g. "C5-3") with zoningConfidence = "official_local_open_data". Without creds it falls back to OSM/placeholder.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
