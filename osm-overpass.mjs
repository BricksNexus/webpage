/**
 * OpenStreetMap via Overpass API — building / landuse / (rare) zoning tags near a point.
 * Crowdsourced; not a legal zoning determination. No API key; use modest timeouts.
 *
 * Public instance: overpass-api.de — respect usage policy.
 */

const DEFAULT_OVERPASS =
  process.env.OSM_OVERPASS_URL || "https://overpass-api.de/api/interpreter";

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{ buildingRadiusM?: number, landuseRadiusM?: number }} opts
 */
export async function fetchOsmPropertyHints(lat, lng, opts = {}) {
  const br = Math.min(120, Math.max(20, opts.buildingRadiusM ?? 45));
  const lr = Math.min(200, Math.max(40, opts.landuseRadiusM ?? 100));

  const query = `
[out:json][timeout:25];
(
  way["building"](around:${br},${lat},${lng});
  node["building"](around:${br},${lat},${lng});
  relation["building"](around:${br},${lat},${lng});
  way["landuse"](around:${lr},${lat},${lng});
  way["leisure"](around:${lr},${lat},${lng});
  way["amenity"](around:${lr},${lat},${lng});
  relation["zoning"](around:${lr + 40},${lat},${lng});
  way["zoning"](around:${lr + 40},${lat},${lng});
);
out tags center;
`.trim();

  try {
    const res = await fetch(DEFAULT_OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      const t = await res.text();
      return {
        ok: false,
        error: `Overpass HTTP ${res.status}: ${t.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const elements = data.elements || [];

    const buildings = [];
    const landuses = [];
    const amenities = [];
    const zoningTags = [];

    for (const el of elements) {
      const tags = el.tags || {};
      if (tags.building) buildings.push(tags.building);
      if (tags.landuse) landuses.push(tags.landuse);
      if (tags.leisure) landuses.push(`leisure:${tags.leisure}`);
      if (tags.amenity) amenities.push(tags.amenity);
      if (tags.zoning) zoningTags.push(tags.zoning);
    }

    return {
      ok: true,
      source: "openstreetmap_overpass",
      overpassUrl: DEFAULT_OVERPASS,
      buildingTypes: uniq(buildings).slice(0, 12),
      landuseAndOpenSpace: uniq(landuses).slice(0, 12),
      amenities: uniq(amenities).slice(0, 8),
      zoningLikeTags: uniq(zoningTags).slice(0, 8),
      elementCount: elements.length,
      note:
        "OSM tags describe what mappers recorded; they are not a substitute for municipal zoning maps or certificates of occupancy.",
    };
  } catch (e) {
    return {
      ok: false,
      error: e?.message || String(e),
    };
  }
}
