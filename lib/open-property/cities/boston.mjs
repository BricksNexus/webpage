/**
 * Boston: CKAN Property Assessment (optional local layer)
 */

const CKAN_ACTION = "https://data.boston.gov/api/3/action/datastore_search";

export async function bostonDatastoreSearch(queryText) {
  const resourceId = process.env.BOSTON_PROPERTY_ASSESSMENT_RESOURCE_ID;
  if (!resourceId) {
    return {
      ok: false,
      skipped: true,
      reason:
        "BOSTON_PROPERTY_ASSESSMENT_RESOURCE_ID not set. Get resource_id from data.boston.gov Property Assessment.",
    };
  }

  const body = {
    resource_id: resourceId,
    q: String(queryText || "").trim(),
    limit: 5,
  };

  const res = await fetch(CKAN_ACTION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `CKAN HTTP ${res.status}: ${t}` };
  }

  const json = await res.json();
  if (!json.success) {
    return {
      ok: false,
      error: json.error?.message || "CKAN datastore_search failed",
      raw: json,
    };
  }

  const records = json.result?.records || [];
  const fields = json.result?.fields?.map((f) => f.id) || [];
  const row = records[0];
  if (!row) {
    return {
      ok: false,
      error:
        "No assessing records matched text search. Try a shorter street query.",
      fieldsHint: fields.slice(0, 40),
    };
  }

  const zoning =
    row.ZONING ||
    row.zoning ||
    row.Zoning ||
    row.ZONE ||
    row.zone ||
    null;

  const landUse =
    row.LU_DESC ||
    row.LU ||
    row.lu ||
    row.USE_CODE ||
    row.USECODE ||
    row.land_use ||
    null;

  const ownerOccupied =
    row.OWN_OCC ||
    row.own_occ ||
    row.owner_occupied ||
    row.OO ||
    null;

  return {
    ok: true,
    source: "boston_ckan_property_assessment",
    matchCount: records.length,
    zoningDistrict: zoning,
    landUseOrOccupancy: landUse,
    ownerOccupied,
    sampleRecord: row,
    fieldNames: fields,
  };
}

export async function fetchBostonRecords(normalizedAddress) {
  const assessing = await bostonDatastoreSearch(normalizedAddress);
  return { city: "boston", assessing };
}
