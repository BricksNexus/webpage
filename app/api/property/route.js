import { NextResponse } from "next/server";
import { fetchPropertyIntel } from "@/lib/open-property/fetch-property-intel.mjs";
import { CORS_HEADERS } from "@/lib/api-cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/property
 * Body: { address: string, metroOverride?: "nyc" | "boston" | "generic" }
 *
 * Open-source stack:
 * - Geocoding: Mapbox/Google if set; else free U.S. Census one-line (US); else OSM Nominatim; else parse-only demo (no coords)
 * - U.S.: Census Geocoder geographies (jurisdiction — no API key) when coordinates exist
 * - Worldwide: OpenStreetMap Overpass when coordinates exist
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
        { status: 400, headers: CORS_HEADERS }
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

    return NextResponse.json(
      { ok: true, property: propertyData },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Property lookup failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
