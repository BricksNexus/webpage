/**
 * POST /api/nyc-property
 *
 * Returns a cross-validated NYC property facts object by combining:
 *   1. NYC GeoSearch  → BBL (free, no key)
 *   2. ATTOM          → owner, sale history, construction (ATTOM_API_KEY)
 *   3. NYC MapPLUTO   → zoning, units, areas, building class (Socrata, free)
 *
 * Each source is fetched independently — one failure does not crash the rest.
 * Fields that disagree across sources are recorded in dataQuality.conflicts[].
 *
 * Test addresses:
 *   "305 East 105 Street, New York, NY 10029"  → BBL 1016770005, R7A, owner 305 MK SECURE HOLDINGS LLC
 *   "120 Broadway, New York, NY 10271"          → prominent office tower, Manhattan
 *   "1 MetroTech Center, Brooklyn, NY 11201"    → mixed-use, Brooklyn
 *
 * Body: { address: string }
 * Response: { ok: true, property, dataQuality } | { error: string }
 */

import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/api-cors";
import { geocodeNYC } from "@/lib/nyc-property/geosearch";
import { fetchAttomProperty } from "@/lib/nyc-property/attom";
import { fetchPlutoByBbl } from "@/lib/nyc-property/pluto";
import { mergeProperty } from "@/lib/nyc-property/mergeProperty";
import type { AttomPropertyData } from "@/lib/nyc-property/attom";
import type { PlutoPropertyData } from "@/lib/nyc-property/pluto";

// Vercel Fluid Compute: allow up to 60s for the three sequential/parallel fetches
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const address = String(body?.address ?? "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Step 1: Geocode → BBL (required; fail fast if this fails) ──────────
    let geo;
    try {
      geo = await geocodeNYC(address);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Geocoding failed: ${(e as Error).message}` },
        { status: 422, headers: CORS_HEADERS }
      );
    }

    // ── Steps 2 & 3: ATTOM + PLUTO in parallel, each fault-tolerant ────────
    const [attomResult, plutoResult] = await Promise.allSettled([
      fetchAttomProperty(address),
      fetchPlutoByBbl(geo.bbl),
    ]);

    const attom: AttomPropertyData | null =
      attomResult.status === "fulfilled" ? attomResult.value : null;
    const pluto: PlutoPropertyData | null =
      plutoResult.status === "fulfilled" ? plutoResult.value : null;

    // Collect source-fetch errors for the dataQuality block
    const sourceErrors: Record<string, string> = {};
    if (attomResult.status === "rejected") {
      sourceErrors.attom = (attomResult.reason as Error)?.message ?? "ATTOM fetch failed";
    }
    if (plutoResult.status === "rejected") {
      sourceErrors.pluto = (plutoResult.reason as Error)?.message ?? "PLUTO fetch failed";
    }

    // ── Step 4: Merge + cross-validate ──────────────────────────────────────
    const { property, dataQuality } = mergeProperty(geo, attom, pluto);

    return NextResponse.json(
      {
        ok: true,
        property,
        dataQuality: {
          ...dataQuality,
          ...(Object.keys(sourceErrors).length ? { sourceErrors } : {}),
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error)?.message ?? "Property lookup failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
