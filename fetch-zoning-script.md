# `fetch-zoning-by-address` script

## What it does

1. **Geocodes** the input address with **Mapbox** or **Google** (whichever key is set).
2. **All cities / countries:** queries **OpenStreetMap (Overpass)** near the coordinates for **building**, **landuse**, and rare **zoning** tags (crowdsourced hints).
3. **United States:** queries the **U.S. Census Geocoder** (free, no key) for **incorporated place / county / state** — jurisdiction context, **not** legal zoning.
4. **Optional** (when location + env match): **NYC** (Geoclient + PLUTO) or **Boston** (CKAN assessing). Force or skip with `--city nyc|boston|generic`.
5. Prints one JSON object to stdout, including `limitations` and `discoverMore` links for finding local zoning GIS.

## Setup

1. Copy env vars from `.env.example` into `.env.local` (the script loads `.env.local` automatically when present).

Alternatively:

```bash
export MAPBOX_ACCESS_TOKEN=...
node scripts/fetch-zoning-by-address.mjs "120 Broadway, New York, NY" --city nyc
```

## Commands

```bash
npm run fetch-zoning -- "120 Broadway, New York, NY"
npm run fetch-zoning -- "1 City Hall Plaza, Boston, MA" --city boston
npm run fetch-zoning -- "Paris, France"
npm run fetch-zoning -- "120 Broadway, New York, NY" --city generic
```

`--city generic` skips NYC/Boston official connectors (only OSM + US Census).

## Puppeteer / portals

If there is **no** suitable API, see **`docs/zoning-fetch-puppeteer-fallbacks.md`** for ZoLa, PIP-style flows, and BPDA map strategies.

## Occupancy note

- **NYC:** PLUTO gives **building class** and **zoning**; a **legal occupancy** statement usually comes from **DOB** records, not PLUTO alone.
- **Boston:** Assessing **land use** fields are not a substitute for zoning determination or occupancy certification—treat as **hints** only.
