/**
 * NYC: Geoclient + PLUTO (see scripts-era docs in docs/fetch-zoning-script.md)
 *
 * BBL resolution order:
 *  1. NYC Geoclient (paid, needs APP_ID + APP_KEY) — most accurate
 *  2. NYC Planning Geosearch (free, no key) — used when Geoclient keys absent
 */

const GEOCLIENT_BASE = "https://maps.nyc.gov/geoclient/v2/search.json";
const GEOSEARCH_BASE = "https://geosearch.planninglabs.nyc/v2/search";

async function nycGeosearchFallback(address) {
  const params = new URLSearchParams({ text: String(address).trim(), size: "1" });
  const res = await fetch(`${GEOSEARCH_BASE}?${params}`);
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `Geosearch HTTP ${res.status}: ${t}` };
  }
  const data = await res.json();
  const feature = data.features?.[0];
  const bbl = feature?.properties?.addendum?.pad?.bbl || feature?.properties?.pad_bbl;
  if (!bbl) {
    return { ok: false, error: "Geosearch returned no BBL for this address.", raw: data };
  }
  return {
    ok: true,
    bbl: String(bbl).replace(/\D/g, "").slice(0, 10),
    source: "geosearch",
  };
}

export async function nycGeoclientSearch(address) {
  const appId = process.env.NYC_GEOCLIENT_APP_ID;
  const appKey = process.env.NYC_GEOCLIENT_APP_KEY;

  // Fall back to free NYC Planning Geosearch when Geoclient keys are not configured
  if (!appId || !appKey) {
    return nycGeosearchFallback(address);
  }

  const params = new URLSearchParams({
    input: String(address).trim(),
    app_id: appId,
    app_key: appKey,
  });

  const res = await fetch(`${GEOCLIENT_BASE}?${params}`);
  if (!res.ok) {
    const t = await res.text();
    // Geoclient failed — try free Geosearch as fallback
    return nycGeosearchFallback(address);
  }

  const data = await res.json();
  const first = data.results?.[0] || data.result?.[0];
  const inner = first?.response || first?.properties || first;
  const bbl =
    inner?.bbl ||
    first?.bbl ||
    first?.properties?.bbl ||
    first?.items?.[0]?.bbl ||
    data?.bbl;

  if (!bbl) {
    // Geoclient gave no BBL — try free Geosearch as fallback
    return nycGeosearchFallback(address);
  }

  return {
    ok: true,
    bbl: String(bbl).replace(/\D/g, "").slice(0, 10),
    raw: data,
  };
}

// Public MapPLUTO dataset on NYC Open Data (no token required for anonymous access)
const DEFAULT_PLUTO_DATASET = "64uk-42ks";

export async function nycFetchPlutoByBbl(bbl) {
  const datasetId = process.env.NYC_PLUTO_SODA_DATASET_ID || DEFAULT_PLUTO_DATASET;

  const token = process.env.NYC_SODA_APP_TOKEN;
  const base = `https://data.cityofnewyork.us/resource/${datasetId}.json`;
  const params = new URLSearchParams({ bbl: String(bbl), $limit: "1" });
  const headers = {};
  if (token) headers["X-App-Token"] = token;

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

  const zoningDistrict =
    row.zonedist1 ||
    row.Zonedist1 ||
    row.zonedist ||
    row.ZoneDist1 ||
    row.zone_dist ||
    null;

  const buildingClass =
    row.bldgclass ||
    row.BldgClass ||
    row.bldg_class ||
    row.buildingclass ||
    null;

  const lotArea =
    row.lotarea ?? row.LotArea ?? row.lot_area ?? row.lotArea ?? null;

  return {
    ok: true,
    source: "nyc_open_data_socrata_pluto",
    bbl,
    zoningDistrict,
    buildingClass,
    ownerName: row.ownername || row.ownerName || null,
    lotAreaSqFt: lotArea != null ? Number(lotArea) : null,
    // --- Extended PLUTO fields (Phase 2 addition) ---
    numFloors:          row.numfloors != null ? Number(row.numfloors) : null,
    residentialArea:    row.resarea != null ? Number(row.resarea) : null,
    commercialArea:     row.comarea != null ? Number(row.comarea) : null,
    totalBuildingArea:  row.bldgarea != null ? Number(row.bldgarea) : null,
    residentialUnits:   row.unitsres != null ? Number(row.unitsres) : null,
    totalUnits:         row.unitstotal != null ? Number(row.unitstotal) : null,
    buildingFrontage:   row.bldgfront != null ? Number(row.bldgfront) : null,
    lotFrontage:        row.lotfront != null ? Number(row.lotfront) : null,
    lotDepth:           row.lotdepth != null ? Number(row.lotdepth) : null,
    yearBuiltPluto:     row.yearbuilt != null ? Number(row.yearbuilt) : null,
    numBuildings:       row.numbldgs != null ? Number(row.numbldgs) : null,
    block:              row.block || null,
    lot:                row.lot || null,
    taxClass:           row.taxclassat || row.taxclass || null,
    buildingStyle:      row.proxdescription || row.landuse || null,
    buildingDepth:      row.bldgdepth || null,
    constructionType:   row.ext || row.bsmtcode || null,
    // FAR fields — used by fetch_zoning_rules node in LangGraph pipeline
    residFar:           row.residfar != null ? Number(row.residfar) : null,
    commFar:            row.commfar != null ? Number(row.commfar) : null,
    useAndOccupancyNote:
      "PLUTO does not replace a Certificate of Occupancy. For occupancy class, use DOB BIS/DOB NOW or PIP (see docs).",
    rawRowKeys: Object.keys(row),
  };
}

export async function fetchNycRecords(normalizedAddress) {
  const geo = await nycGeoclientSearch(normalizedAddress);
  if (!geo.ok) return { city: "nyc", geoclient: geo, pluto: null };

  const pluto = await nycFetchPlutoByBbl(geo.bbl);
  return {
    city: "nyc",
    geoclient: geo,
    pluto,
  };
}
