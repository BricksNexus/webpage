/**
 * Geocoding order:
 * 1) MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY (best quality)
 * 2) U.S. Census one-line geocoder — no API key (US addresses)
 * 3) OpenStreetMap Nominatim — no key; respect usage policy (global)
 * 4) Parsed-address-only stub — no coordinates (demo / OSM+Census skipped)
 *
 * Set DISABLE_NOMINATIM_GEOCODE=1 to skip step 3 (e.g. strict compliance).
 */

function pickPaidProvider() {
  if (process.env.MAPBOX_ACCESS_TOKEN) return "mapbox";
  if (process.env.GOOGLE_MAPS_GEOCODING_API_KEY) return "google";
  return null;
}

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT ||
  "BricksNexus-Website/1.0 (property demo; no reply expected)";

/**
 * U.S. Census Geocoder — public, no key. Best for US street addresses.
 * @param {string} q
 * @returns {Promise<object|null>}
 */
async function geocodeCensusOneline(q) {
  const params = new URLSearchParams({
    address: q,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data?.result?.addressMatches;
    if (!Array.isArray(matches) || matches.length === 0) return null;
    const m = matches[0];
    const coords = m.coordinates;
    if (!coords || coords.x == null || coords.y == null) return null;
    const lng = Number(coords.x);
    const lat = Number(coords.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const comps = m.addressComponents || {};
    const city =
      comps.city || comps.placeName || comps.subdivision || null;
    const region = comps.state || null;
    const zip = comps.zip || null;

    return {
      provider: "us_census_oneline",
      geocoderTier: "free_us_census",
      normalized: m.matchedAddress || q,
      coordinates: { lat, lng },
      context: {
        city,
        region,
        country: "US",
        postcode: zip,
        placeType: "address",
      },
    };
  } catch {
    return null;
  }
}

/**
 * OSM Nominatim — no API key; use sparingly (see https://operations.osmfoundation.org/policies/nominatim/).
 * @param {string} q
 * @returns {Promise<object|null>}
 */
async function geocodeNominatim(q) {
  if (process.env.DISABLE_NOMINATIM_GEOCODE === "1") return null;
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    addressdetails: "1",
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    /** @type {unknown} */
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const hit = rows[0];
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const addr = hit.address || {};
    const country = (addr.country_code || "").toUpperCase() || null;
    const region =
      addr.state ||
      addr.region ||
      (addr["ISO3166-2-lvl4"] || "").replace(/^US-/, "") ||
      null;
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.municipality ||
      null;

    const countryNorm =
      country === "US" || country === "USA" ? "US" : country || null;

    return {
      provider: "nominatim",
      geocoderTier: "free_osm_nominatim",
      normalized: hit.display_name || q,
      coordinates: { lat, lng },
      context: {
        city,
        region,
        country: countryNorm,
        postcode: addr.postcode || null,
        placeType: hit.type || hit.class || null,
      },
    };
  } catch {
    return null;
  }
}

/** Last resort: parse "City, ST" from commas — no lat/lng. */
function geocodeDemoParseOnly(q) {
  const parts = q.split(",").map((s) => s.trim()).filter(Boolean);
  let city = null;
  let region = null;
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    const stateMatch = tail.match(/\b([A-Za-z]{2})\b/);
    region = stateMatch ? stateMatch[1].toUpperCase() : null;
    city = parts[parts.length - 2] || null;
  }
  return {
    provider: "demo_parse",
    geocoderTier: "demo_parse_no_coordinates",
    normalized: q,
    coordinates: { lat: null, lng: null },
    context: {
      city,
      region,
      country: region ? "US" : null,
      postcode: null,
      placeType: null,
    },
    demoNote:
      "No Mapbox/Google and geocoding did not return coordinates; city/state guessed from commas. Add MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY for full OSM/Census layers.",
  };
}

/**
 * @param {string} address
 */
export async function geocodeAddress(address) {
  const q = String(address || "").trim();
  if (!q) throw new Error("Address is required.");

  const paid = pickPaidProvider();
  if (paid === "mapbox") {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    const encoded = encodeURIComponent(q);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Mapbox geocode failed: ${res.status} ${t}`);
    }
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) throw new Error("Mapbox returned no results for this address.");

    const [lng, lat] = feat.center;
    const normalized = feat.place_name || q;
    const ctx = {};
    for (const c of feat.context || []) {
      const prefix = String(c.id || "").split(".")[0];
      if (prefix === "place") ctx.city = c.text;
      if (prefix === "region")
        ctx.region = c.short_code?.replace("US-", "") || c.text;
      if (prefix === "country") ctx.country = c.short_code || c.text;
      if (prefix === "postcode") ctx.postcode = c.text;
    }
    if (!ctx.city && feat.place_type?.includes("place")) {
      ctx.city = feat.text;
    }

    return {
      provider: "mapbox",
      geocoderTier: "paid_mapbox",
      normalized,
      coordinates: { lat, lng },
      context: {
        city: ctx.city,
        region: ctx.region,
        country: ctx.country,
        postcode: ctx.postcode,
        placeType: feat.place_type?.[0],
      },
    };
  }

  if (paid === "google") {
    const key = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google geocode HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) {
      throw new Error(
        `Google geocode failed: ${data.status} ${data.error_message || ""}`.trim()
      );
    }
    const r = data.results[0];
    const loc = r.geometry.location;
    const comps = r.address_components || [];
    const get = (type) =>
      comps.find((c) => c.types.includes(type))?.long_name;

    return {
      provider: "google",
      geocoderTier: "paid_google",
      normalized: r.formatted_address,
      coordinates: { lat: loc.lat, lng: loc.lng },
      context: {
        city: get("locality") || get("sublocality") || get("neighborhood"),
        region: get("administrative_area_level_1"),
        country: get("country"),
        postcode: get("postal_code"),
        placeType: r.types?.[0],
      },
    };
  }

  const censusHit = await geocodeCensusOneline(q);
  if (censusHit) return censusHit;

  const nomHit = await geocodeNominatim(q);
  if (nomHit) return nomHit;

  return geocodeDemoParseOnly(q);
}

/** True when geocode result includes usable WGS84 coordinates. */
export function geocodeHasCoordinates(geo) {
  const lat = geo?.coordinates?.lat;
  const lng = geo?.coordinates?.lng;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export function isLikelyUnitedStates(geo) {
  const c = (geo.context.country || "").toUpperCase();
  if (c === "US" || c === "USA") return true;
  if (c.includes("UNITED STATES")) return true;
  /** demo_parse sets country when a 2-letter state was guessed */
  if (geo?.provider === "demo_parse" && geo?.context?.region) {
    return /^[A-Z]{2}$/.test(String(geo.context.region).toUpperCase());
  }
  return false;
}

/** Rough routing for optional city-specific official connectors. */
export function inferMetroFromGeocode(geo) {
  const city = (geo.context.city || "").toLowerCase();
  const region = (geo.context.region || "").toLowerCase();

  if (
    region === "ny" &&
    /new york|nyc|manhattan|brooklyn|queens|bronx|staten/i.test(
      geo.normalized
    )
  ) {
    return "nyc";
  }
  if (city === "boston" && region === "ma") return "boston";
  if (/boston/i.test(city) && region === "ma") return "boston";

  return "generic";
}
