/**
 * U.S. Census Bureau Geocoder — geography from coordinates (no API key).
 * https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 *
 * Returns incorporated place, county, state FIPS, etc. This is jurisdiction context,
 * not parcel zoning.
 */

const CENSUS_COORDS =
  "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

/**
 * @param {number} lat
 * @param {number} lng
 */
export async function fetchCensusGeographies(lat, lng) {
  const url = new URL(CENSUS_COORDS);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      error: `Census geographies HTTP ${res.status}: ${t.slice(0, 200)}`,
    };
  }

  const data = await res.json();
  const geographies = data.result?.geographies || {};
  if (!data.result || Object.keys(geographies).length === 0) {
    return {
      ok: false,
      error: "Census returned no geographies (point may be outside US coverage).",
      raw: data,
    };
  }

  const pick = (keys) => {
    for (const k of keys) {
      const arr = geographies[k];
      if (Array.isArray(arr) && arr[0]) return arr[0];
    }
    return null;
  };

  const place = pick([
    "Incorporated Places",
    "Consolidated Cities",
    "Places",
  ]);
  const county = pick(["Counties"]);
  const state = pick(["States"]);

  return {
    ok: true,
    source: "us_census_geocoder_geographies",
    incorporatedPlace: place?.NAME || place?.name || null,
    placeGeoid: place?.GEOID || place?.geoid || null,
    county: county?.NAME || county?.name || null,
    countyGeoid: county?.GEOID || county?.geoid || null,
    state: state?.NAME || state?.name || null,
    stateGeoid: state?.GEOID || state?.geoid || null,
    allGeographyLayerKeys: Object.keys(geographies),
  };
}
