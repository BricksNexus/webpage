/**
 * NYC: Geoclient + PLUTO (see scripts-era docs in docs/fetch-zoning-script.md)
 */

const GEOCLIENT_BASE = "https://maps.nyc.gov/geoclient/v2/search.json";

export async function nycGeoclientSearch(address) {
  const appId = process.env.NYC_GEOCLIENT_APP_ID;
  const appKey = process.env.NYC_GEOCLIENT_APP_KEY;
  if (!appId || !appKey) {
    return {
      ok: false,
      skipped: true,
      reason:
        "NYC_GEOCLIENT_APP_ID / NYC_GEOCLIENT_APP_KEY not set. Register at NYC Developer Portal.",
    };
  }

  const params = new URLSearchParams({
    input: String(address).trim(),
    app_id: appId,
    app_key: appKey,
  });

  const res = await fetch(`${GEOCLIENT_BASE}?${params}`);
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `Geoclient HTTP ${res.status}: ${t}` };
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
    return {
      ok: false,
      error:
        "Geoclient returned no BBL. Verify address, credentials, and API response shape (see raw).",
      raw: data,
    };
  }

  return {
    ok: true,
    bbl: String(bbl).replace(/\D/g, "").slice(0, 10),
    raw: data,
  };
}

export async function nycFetchPlutoByBbl(bbl) {
  const datasetId = process.env.NYC_PLUTO_SODA_DATASET_ID;
  if (!datasetId) {
    return {
      ok: false,
      skipped: true,
      reason:
        "NYC_PLUTO_SODA_DATASET_ID not set. Copy the resource id from data.cityofnewyork.us (PLUTO/MapPLUTO).",
    };
  }

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
    lotAreaSqFt: lotArea != null ? Number(lotArea) : null,
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
