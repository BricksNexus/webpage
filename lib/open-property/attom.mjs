/**
 * AttomData property lookup.
 * Returns owner name, block/lot, use & occupancy from the basicprofile endpoint.
 * Returns null fields gracefully when the key is missing, invalid, or the address is not found.
 */

const ATTOM_BASE = "https://api.attomdata.com/propertyapi/v1.0.0";

/**
 * @param {string} address  Street portion, e.g. "120 Broadway"
 * @param {string} address2 City/state/zip, e.g. "New York, NY 10271"
 * @returns {Promise<AttomResult>}
 */
export async function fetchAttomProperty(address, address2) {
  const apiKey = process.env.ATTOMDATA_API_KEY;
  if (!apiKey) return emptyResult("no_api_key");

  const params = new URLSearchParams({ address, address2 });
  const url = `${ATTOM_BASE}/property/basicprofile?${params}`;

  let raw;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return emptyResult(`http_${res.status}`);
    }

    raw = await res.json();
  } catch (err) {
    return emptyResult(`fetch_error: ${err.message}`);
  }

  const property = raw?.property?.[0];
  if (!property) return emptyResult("not_found");

  const owner = property.owner;
  const lot = property.lot;
  const building = property.building;
  const summary = property.summary;

  return {
    ok: true,
    error: null,
    ownerName: formatOwnerName(owner),
    block: lot?.block ?? null,
    lot: lot?.lot ?? null,
    lotSizeSqFt: lot?.lotsize2 ?? lot?.lotsize1 ?? null,
    useOccupancy: summary?.propsubtype ?? summary?.proptype ?? null,
    propertyType: summary?.proptype ?? null,
    yearBuilt: summary?.yearbuilt ?? null,
    assessedValue: property.assessment?.assessed?.assdttlvalue ?? null,
    bedrooms: building?.rooms?.beds ?? null,
    bathrooms: building?.rooms?.bathstotal ?? null,
    stories: building?.summary?.floors ?? null,
    buildingSqFt: building?.size?.universalsize ?? null,
  };
}

function formatOwnerName(owner) {
  if (!owner) return null;
  const name = owner.owner1?.lastname
    ? `${owner.owner1.lastname}${owner.owner1.firstname ? ", " + owner.owner1.firstname : ""}`
    : owner.corporateindicator === "Y"
    ? owner.owner1?.lastname ?? null
    : null;
  return name ?? null;
}

function emptyResult(error) {
  return {
    ok: false,
    error,
    ownerName: null,
    block: null,
    lot: null,
    lotSizeSqFt: null,
    useOccupancy: null,
    propertyType: null,
    yearBuilt: null,
    assessedValue: null,
    bedrooms: null,
    bathrooms: null,
    stories: null,
    buildingSqFt: null,
  };
}

/** @typedef {ReturnType<typeof emptyResult> & { ok: boolean }} AttomResult */
