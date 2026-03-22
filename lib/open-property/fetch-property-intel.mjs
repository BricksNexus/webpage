/**
 * Nationwide (and global OSM) open-source property hints:
 * - Geocode (Mapbox / Google)
 * - US: Census geocoder → jurisdiction (place / county / state)
 * - OSM Overpass → building / landuse / rare zoning tags
 * - Optional: NYC / Boston official open-data connectors when configured
 */

import { fetchCensusGeographies } from "./census-geographies.mjs";
import { fetchOsmPropertyHints } from "./osm-overpass.mjs";
import {
  geocodeAddress,
  geocodeHasCoordinates,
  inferMetroFromGeocode,
  isLikelyUnitedStates,
} from "./geocode.mjs";
import { fetchNycRecords } from "./cities/nyc.mjs";
import { fetchBostonRecords } from "./cities/boston.mjs";

function buildDerivedSummary({
  geocode,
  census,
  osm,
  localRecords,
}) {
  let zoningDistrict = null;
  let zoningConfidence = "unknown";
  let lotAreaSqFt = null;
  const buildingHints = [];

  const nycPluto = localRecords?.nyc?.pluto;
  if (nycPluto?.ok && nycPluto.zoningDistrict) {
    zoningDistrict = String(nycPluto.zoningDistrict);
    zoningConfidence = "official_local_open_data";
    lotAreaSqFt = nycPluto.lotAreaSqFt ?? lotAreaSqFt;
    if (nycPluto.buildingClass)
      buildingHints.push(`Building class (PLUTO): ${nycPluto.buildingClass}`);
  }

  const boston = localRecords?.boston?.assessing;
  if (!zoningDistrict && boston?.ok && boston.zoningDistrict) {
    zoningDistrict = String(boston.zoningDistrict);
    zoningConfidence = "official_local_open_data";
  }
  if (boston?.ok && boston.landUseOrOccupancy) {
    buildingHints.push(`Assessor land use: ${boston.landUseOrOccupancy}`);
  }

  if (
    osm?.ok &&
    osm.zoningLikeTags?.length &&
    zoningConfidence === "unknown"
  ) {
    zoningDistrict = osm.zoningLikeTags.join(", ");
    zoningConfidence = "osm_tag_crowdsourced";
  }

  if (osm?.ok && osm.buildingTypes?.length) {
    buildingHints.push(`OSM building types: ${osm.buildingTypes.join(", ")}`);
  }
  if (osm?.ok && osm.landuseAndOpenSpace?.length) {
    buildingHints.push(
      `OSM landuse/leisure: ${osm.landuseAndOpenSpace.join(", ")}`
    );
  }

  const useParts = [];
  if (boston?.ok && boston.landUseOrOccupancy) {
    useParts.push(`Assessor: ${boston.landUseOrOccupancy}`);
  }
  if (boston?.ok && boston.ownerOccupied != null && boston.ownerOccupied !== "") {
    useParts.push(`Owner-occupied flag (assessor): ${boston.ownerOccupied}`);
  }
  if (osm?.ok && osm.amenities?.length) {
    useParts.push(`Nearby OSM amenities: ${osm.amenities.join(", ")}`);
  }
  if (nycPluto?.useAndOccupancyNote) {
    useParts.push(nycPluto.useAndOccupancyNote);
  }

  const useAndOccupancyHint =
    useParts.length > 0
      ? useParts.join(" | ")
      : osm?.ok
        ? "No assessor/CO data from open connectors; OSM tags above are physical hints only."
        : "No use/occupancy fields retrieved; check local assessor and building department open data.";

  return {
    zoningDistrict,
    zoningConfidence,
    lotAreaSqFt,
    useAndOccupancyHint,
    buildingUseHints: buildingHints,
  };
}

/**
 * @param {string} address
 * @param {{ metroOverride?: 'nyc'|'boston'|'generic' }} [options]
 */
export async function fetchPropertyIntel(address, options = {}) {
  const inputAddress = String(address || "").trim();
  if (!inputAddress) throw new Error("Address is required.");

  const geocode = await geocodeAddress(inputAddress);
  const hasCoords = geocodeHasCoordinates(geocode);
  const lat = hasCoords ? geocode.coordinates.lat : null;
  const lng = hasCoords ? geocode.coordinates.lng : null;

  const metro =
    options.metroOverride === "generic"
      ? "generic"
      : options.metroOverride || inferMetroFromGeocode(geocode);

  /** @type {{ census?: object, osm?: object }} */
  const layers = {};

  if (!hasCoords) {
    layers.census = {
      ok: false,
      skipped: true,
      reason:
        geocode?.provider === "demo_parse"
          ? "No coordinates (address parse only). Set MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY, or use a US address for free Census geocoding / global Nominatim."
          : "No coordinates from geocoder; Census skipped.",
    };
    layers.osm = {
      ok: false,
      skipped: true,
      reason:
        "OpenStreetMap Overpass requires latitude/longitude. Use paid geocoding or a resolvable US/global address.",
    };
  } else if (isLikelyUnitedStates(geocode)) {
    layers.census = await fetchCensusGeographies(lat, lng);
  } else {
    layers.census = {
      ok: false,
      skipped: true,
      reason:
        "Geocoder country is not treated as US; Census jurisdiction lookup skipped. OSM still runs worldwide.",
    };
  }

  if (hasCoords) {
    layers.osm = await fetchOsmPropertyHints(lat, lng);
  }

  /** @type {Record<string, unknown>} */
  const localRecords = {};

  if (metro === "nyc") {
    localRecords.nyc = await fetchNycRecords(geocode.normalized);
  }
  if (metro === "boston") {
    localRecords.boston = await fetchBostonRecords(geocode.normalized);
  }

  const derivedSummary = buildDerivedSummary({
    geocode,
    census: layers.census,
    osm: layers.osm,
    localRecords,
  });

  const limitations = [
    "There is no single global API for legal zoning districts and certificates of occupancy for every city.",
    "OpenStreetMap is crowdsourced and incomplete; Census geographies identify jurisdiction, not zoning.",
    "For authoritative zoning, use the municipality's open-data portal, ArcGIS Hub layers, or county parcel GIS.",
  ];

  const discoverMore = {
    arcgisHubZoningSearch: "https://hub.arcgis.com/search?q=zoning",
    openDataNetwork: "https://www.opendatanetwork.com/",
    osmKeyBuilding: "https://wiki.openstreetmap.org/wiki/Key:building",
    osmKeyLanduse: "https://wiki.openstreetmap.org/wiki/Key:landuse",
  };

  const tier = geocode.geocoderTier || "unknown";
  const dataQuality =
    !hasCoords
      ? "demo_no_coordinates_parse_only"
      : metro !== "generic" &&
          (localRecords.nyc?.pluto?.ok || localRecords.boston?.assessing?.ok)
        ? "open_sources_us_plus_local_connector"
        : tier === "free_us_census" || tier === "free_osm_nominatim"
          ? "open_sources_free_geocoder_osm_census_when_us"
          : "open_sources_worldwide_osm_plus_us_census_when_us";

  const intel = {
    inputAddress,
    fetchedAt: new Date().toISOString(),
    dataQuality,
    geocode,
    jurisdiction: {
      censusGeographies: layers.census,
    },
    openStreetMap: layers.osm,
    localRecords:
      Object.keys(localRecords).length > 0 ? localRecords : undefined,
    derivedSummary,
    limitations,
    discoverMore,
  };

  /** Flatten for older UIs (e.g. FeasibilityChat) */
  intel.zoningDistrict =
    derivedSummary.zoningDistrict ||
    "— Use local open zoning GIS; OSM/Census do not replace municipal maps.";
  intel.lotAreaSqFt = derivedSummary.lotAreaSqFt;
  intel.useAndOccupancy = derivedSummary.useAndOccupancyHint;
  intel.city =
    geocode.context.city ||
    (layers.census?.ok ? layers.census.incorporatedPlace : null);
  intel.region = geocode.context.region || null;
  intel.streetLine = geocode.normalized;

  return intel;
}
