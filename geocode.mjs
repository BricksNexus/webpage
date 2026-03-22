/**
 * Normalize an address using Mapbox Geocoding or Google Geocoding.
 * Set MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY in the environment.
 */

function pickProvider() {
  if (process.env.MAPBOX_ACCESS_TOKEN) return "mapbox";
  if (process.env.GOOGLE_MAPS_GEOCODING_API_KEY) return "google";
  return null;
}

/**
 * @param {string} address
 */
export async function geocodeAddress(address) {
  const q = String(address || "").trim();
  if (!q) throw new Error("Address is required.");

  const provider = pickProvider();
  if (!provider) {
    throw new Error(
      "Set MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY for geocoding."
    );
  }

  if (provider === "mapbox") {
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
    normalized: r.formatted_address,
    coordinates: { lat, lng },
    context: {
      city: get("locality") || get("sublocality") || get("neighborhood"),
      region: get("administrative_area_level_1"),
      country: get("country"),
      postcode: get("postal_code"),
      placeType: r.types?.[0],
    },
  };
}

export function isLikelyUnitedStates(geo) {
  const c = (geo.context.country || "").toUpperCase();
  if (!c) return false;
  if (c === "US" || c === "USA") return true;
  if (c.includes("UNITED STATES")) return true;
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
