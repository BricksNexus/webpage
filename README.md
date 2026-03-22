# Open property intel (all cities)

There is **no single worldwide API** that returns **legal zoning districts** and **certificate-of-occupancy** status for every municipality. This package uses **open sources** that scale globally, plus **optional** city-specific open-data connectors.

## What runs everywhere (after geocoding)

| Layer | Coverage | What you get |
|--------|-----------|----------------|
| **Geocoding** | Global (Mapbox / Google) | Normalized address, coordinates, city/region/country |
| **OpenStreetMap (Overpass)** | Global where mapped | `building`, `landuse`, `amenity`, rare `zoning` tags — **hints only** |
| **U.S. Census Geocoder** | United States | Incorporated place, county, state FIPS — **jurisdiction**, not zoning |

## Optional local open data (env + location)

| City | Connectors |
|------|------------|
| **NYC** | Geoclient → BBL; Socrata PLUTO/MapPLUTO → zoning district + building class |
| **Boston** | CKAN Property Assessment text search → assessor fields (zoning may need separate GIS) |

## Important limitations

- **Zoning** is defined by **local law** and GIS layers; OSM is incomplete and not authoritative.
- **Use & occupancy** for compliance usually comes from **building departments** or assessors, not from OSM alone.
- For more cities, add **ArcGIS Hub** / **Socrata** / **CKAN** adapters keyed by **state + place GEOID** from Census.

## Entry point

- `fetchPropertyIntel(address, { metroOverride? })` in `fetch-property-intel.mjs`
- Used by `POST /api/property` and `scripts/fetch-zoning-by-address.mjs`

## Discovery links (for new city adapters)

Returned on each response in `discoverMore` (ArcGIS Hub search, Open Data Network, OSM tag wikis).
