/**
 * POST /api/opportunity-report
 *
 * Orchestrates the full NYC property opportunity analysis pipeline:
 *   1. Geocode + fetch property data   (Phase 1: /lib/nyc-property/)
 *   2. Resolve zoning rules            (Phase 2: /lib/zoning/)
 *   3. Compute deterministic math      (lib/nyc-property/analysisContext.ts)
 *   4. Call Gemini for opportunities[] (lib/nyc-property/opportunityPrompt.ts)
 *   5. Assemble report + persist to KV
 *
 * LLM step degrades gracefully: if Gemini fails, report is returned with
 * property + zoning + math intact and opportunities: [] + llmError note.
 *
 * Body: { address: string }
 * Response: { reportId, address, generatedAt, property, zoning, analysis, dataQuality, disclaimers }
 *
 * Test addresses:
 *   "305 East 105 Street, New York, NY 10029"   → BBL 1016770005, R7A
 *   "120 Broadway, New York, NY 10271"
 *   "1 MetroTech Center, Brooklyn, NY 11201"
 */

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { CORS_HEADERS } from "@/lib/api-cors";
import { geocodeNYC } from "@/lib/nyc-property/geosearch";
import { fetchAttomProperty } from "@/lib/nyc-property/attom";
import { fetchPlutoByBbl } from "@/lib/nyc-property/pluto";
import { mergeProperty } from "@/lib/nyc-property/mergeProperty";
import { resolveZoning } from "@/lib/zoning/resolveZoning";
import { computeAnalysisContext } from "@/lib/nyc-property/analysisContext";
import { callOpportunityAnalysis } from "@/lib/nyc-property/opportunityPrompt";
import { kvSet, kvBackend } from "@/lib/kv";
import type { AttomPropertyData } from "@/lib/nyc-property/attom";
import type { PlutoPropertyData } from "@/lib/nyc-property/pluto";

export const maxDuration = 60;

const DISCLAIMERS = [
  "This report is for educational and research purposes only. It is NOT legal, zoning, or financial advice.",
  "All findings are investigate-leads that require verification with authoritative sources before any action is taken.",
  "Zoning rules, FAR, and height limits are subject to change. Verify current regulations with the NYC Department of City Planning and the NYC Zoning Resolution (zr.planning.nyc.gov).",
  "Building permits, variances, and approvals must be confirmed with the NYC Department of Buildings (DOB).",
  "Property data is sourced from NYC MapPLUTO and ATTOM — it may not reflect recent changes, transfers, or building alterations.",
  "BricksNexus does not guarantee accuracy. Consult a licensed architect, attorney, and zoning professional before making any development decisions.",
];

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

    const reportId = uuidv4();
    const generatedAt = new Date().toISOString();

    // ── Step 1: Geocode → BBL (fail fast if geocoding fails) ─────────────────
    let geo;
    try {
      geo = await geocodeNYC(address);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Geocoding failed: ${(e as Error).message}` },
        { status: 422, headers: CORS_HEADERS }
      );
    }

    // ── Step 2: ATTOM + PLUTO in parallel, each fault-tolerant ───────────────
    const [attomResult, plutoResult] = await Promise.allSettled([
      fetchAttomProperty(address),
      fetchPlutoByBbl(geo.bbl),
    ]);

    const attom: AttomPropertyData | null =
      attomResult.status === "fulfilled" ? attomResult.value : null;
    const pluto: PlutoPropertyData | null =
      plutoResult.status === "fulfilled" ? plutoResult.value : null;

    const sourceErrors: Record<string, string> = {};
    if (attomResult.status === "rejected") {
      sourceErrors.attom = (attomResult.reason as Error)?.message ?? "ATTOM fetch failed";
    }
    if (plutoResult.status === "rejected") {
      sourceErrors.pluto = (plutoResult.reason as Error)?.message ?? "PLUTO fetch failed";
    }

    // ── Step 3: Merge property ────────────────────────────────────────────────
    const { property, dataQuality } = mergeProperty(geo, attom, pluto);

    // ── Step 4: Resolve zoning ────────────────────────────────────────────────
    const rawDistrict = property.zoningDistrict.value;
    let zoning;
    let zoningError: string | null = null;
    if (rawDistrict) {
      try {
        zoning = await resolveZoning(rawDistrict);
      } catch (e: unknown) {
        zoningError = (e as Error).message;
        zoning = await resolveZoning("UNKNOWN"); // returns all-null fetched-unverified
      }
    } else {
      zoningError = "Zoning district not available from property data.";
      zoning = await resolveZoning("UNKNOWN");
    }

    // ── Step 5: Deterministic math ────────────────────────────────────────────
    const math = computeAnalysisContext(property, zoning);

    // ── Step 6: LLM analysis (degrades gracefully) ────────────────────────────
    const { opportunities, llmError, modelUsed } = await callOpportunityAnalysis(
      address,
      property,
      zoning,
      math
    );

    // ── Step 7: Assemble report ───────────────────────────────────────────────
    const report = {
      reportId,
      address,
      generatedAt,
      property,
      zoning,
      analysis: {
        // Deterministic math — auditable, formula-tagged
        lotAreaSqFt: math.lotAreaSqFt,
        existingAreaSqFt: math.existingAreaSqFt,
        residentialFAR: math.residentialFAR,
        maxBuildableArea: math.maxBuildableArea,
        remainingCapacity: math.remainingCapacity,
        existingStories: math.existingStories,
        maxImpliedStories: math.maxImpliedStories,
        storyHeadroom: math.storyHeadroom,
        potentialAdditionalUnits: math.potentialAdditionalUnits,
        currentLotCoverageRatio: math.currentLotCoverageRatio,
        maxLotCoverageRatio: math.maxLotCoverageRatio,
        lotCoverageHeadroom: math.lotCoverageHeadroom,
        // LLM output
        opportunities,
        llmModel: modelUsed,
        ...(llmError ? { llmError } : {}),
      },
      dataQuality: {
        ...dataQuality,
        ...(Object.keys(sourceErrors).length ? { sourceErrors } : {}),
        ...(zoningError ? { zoningError } : {}),
      },
      disclaimers: DISCLAIMERS,
      _meta: {
        kvBackend: kvBackend(),
      },
    };

    // ── Step 8: Persist to KV ─────────────────────────────────────────────────
    try {
      await kvSet(`report:${reportId}`, report);
    } catch (e: unknown) {
      // KV failure does not fail the request — report is still returned
      (report.dataQuality as Record<string, unknown>).kvError =
        `KV persist failed: ${(e as Error).message}`;
    }

    return NextResponse.json({ ok: true, ...report }, { headers: CORS_HEADERS });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error)?.message ?? "Report generation failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
