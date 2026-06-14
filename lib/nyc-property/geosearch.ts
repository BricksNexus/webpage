/**
 * NYC GeoSearch geocoder
 * Docs: https://geosearch.planninglabs.nyc/docs
 * No API key required. Returns BBL (borough-block-lot) and coordinates.
 *
 * BBL encoding: 10-digit string, first digit = borough (1=Manhattan 2=Bronx
 * 3=Brooklyn 4=Queens 5=Staten Island), next 5 = block (zero-padded), last 4 = lot (zero-padded).
 */

const GEOSEARCH_BASE = "https://geosearch.planninglabs.nyc/v2/search";

export interface GeoSearchResult {
  bbl: string;           // raw 10-digit BBL string e.g. "1016770005"
  borough: string;       // human name e.g. "Manhattan"
  boroughCode: string;   // "1"–"5"
  block: string;         // zero-padded 5-digit
  lot: string;           // zero-padded 4-digit
  lat: number;
  lon: number;
  label: string;         // normalized address label from GeoSearch
}

const BOROUGH_NAMES: Record<string, string> = {
  "1": "Manhattan",
  "2": "Bronx",
  "3": "Brooklyn",
  "4": "Queens",
  "5": "Staten Island",
};

export async function geocodeNYC(address: string): Promise<GeoSearchResult> {
  const url = `${GEOSEARCH_BASE}?text=${encodeURIComponent(address)}&size=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "BricksNexus/1.0 (pulipati.j@northeastern.edu)" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`GeoSearch HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature) {
    throw new Error(`GeoSearch returned no results for: "${address}"`);
  }

  const props = feature.properties ?? {};

  // addendum.pad_bbl is the reliable 10-digit BBL field
  const rawBbl: string =
    props?.addendum?.pad?.bbl ??
    props?.pad_bbl ??
    props?.bbl ??
    "";

  if (!rawBbl || rawBbl.length !== 10) {
    throw new Error(
      `GeoSearch result for "${address}" has no valid BBL (got: "${rawBbl}")`
    );
  }

  const boroughCode = rawBbl[0];
  const block = rawBbl.slice(1, 6);
  const lot = rawBbl.slice(6, 10);

  const [lon, lat] = feature.geometry?.coordinates ?? [0, 0];

  return {
    bbl: rawBbl,
    borough: BOROUGH_NAMES[boroughCode] ?? `Borough ${boroughCode}`,
    boroughCode,
    block,
    lot,
    lat,
    lon,
    label: props.label ?? address,
  };
}
