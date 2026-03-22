import { NextResponse } from "next/server";
import { fetchPropertyIntel } from "@/lib/open-property/fetch-property-intel.mjs";

/**
 * POST /api/property
 * Body: { address: string, metroOverride?: "nyc" | "boston" | "generic" }
 *
 * Open-source stack (all cities / countries where geocoder + OSM apply):
 * - Mapbox or Google geocoding (env)
 * - U.S.: Census Geocoder geographies (jurisdiction — no API key)
 * - Worldwide: OpenStreetMap Overpass (building / landuse hints — crowdsourced)
 * - Optional: NYC / Boston official open-data connectors when env + location match
 *
 * Legal zoning & occupancy still require local authoritative sources; see `limitations` in response.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();
    const metroOverride = body?.metroOverride;

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400 }
      );
    }

    const propertyData = await fetchPropertyIntel(address, {
      metroOverride:
        metroOverride === "nyc" || metroOverride === "boston"
          ? metroOverride
          : metroOverride === "generic"
            ? "generic"
            : undefined,
    });

    return NextResponse.json({ ok: true, property: propertyData });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Property lookup failed." },
      { status: 500 }
    );
  }
}
