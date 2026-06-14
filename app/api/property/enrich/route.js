/**
 * POST /api/property/enrich
 * Alias for /api/property — unified property enrichment endpoint.
 * Accepts: { address: string, metroOverride?: "nyc" | "boston" | "generic" }
 * Returns: { ok: true, property: { ownerName, blockLot, validatedAddress, zoningDistrict, useAndOccupancy, localRecords, ... } }
 * Context: API.md (POST /api/property/enrich) | CODEBASE.md (API Routes section)
 */
import { NextResponse } from "next/server";
import { fetchPropertyIntel } from "@/lib/open-property/fetch-property-intel.mjs";
import { CORS_HEADERS } from "@/lib/api-cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

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

    const property = await fetchPropertyIntel(address, {
      metroOverride:
        metroOverride === "nyc" || metroOverride === "boston"
          ? metroOverride
          : metroOverride === "generic"
            ? "generic"
            : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        property: {
          ownerName:          property.ownerName ?? null,
          blockLot:           property.blockLot ?? null,
          validatedAddress:   property.streetLine ?? null,
          zoningDistrict:     property.zoningDistrict ?? null,
          zoningConfidence:   property.derivedSummary?.zoningConfidence ?? null,
          useAndOccupancy:    property.useAndOccupancy ?? null,
          lotAreaSqFt:        property.lotAreaSqFt ?? null,
          assessedValue:      property.attomData?.assessedValue ?? null,
          yearBuilt:          property.attomData?.yearBuilt ?? null,
          buildingSqFt:       property.attomData?.buildingSqFt ?? null,
          stories:            property.attomData?.stories ?? null,
          city:               property.city ?? null,
          region:             property.region ?? null,
          geocode:            property.geocode ?? null,
          localRecords:       property.localRecords ?? null,
          dataQuality:        property.dataQuality ?? null,
          limitations:        property.limitations ?? [],
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Property enrichment failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
