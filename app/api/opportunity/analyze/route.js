/**
 * POST /api/opportunity/analyze
 * Triggers the LangGraph 4-node property opportunity pipeline.
 * Input:  { address: string }
 * Output: { ok: true, report: { address, ownerName, zoningDistrict, aiAssessment, ... } }
 * Context: API.md (POST /api/opportunity/analyze) | CODEBASE.md (API Routes section)
 */
import { NextResponse } from "next/server";
import { propertyPipeline } from "@/lib/langgraph/property-pipeline.mjs";
import { CORS_HEADERS } from "@/lib/api-cors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address` in request body." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Input validation: max 500 chars, strip newlines to prevent prompt injection
    if (address.length > 500) {
      return NextResponse.json(
        { error: "Address exceeds maximum length of 500 characters." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const safeAddress = address.replace(/[\r\n]/g, " ");

    const result = await propertyPipeline.invoke({ address: safeAddress });

    return NextResponse.json(
      { ok: true, report: result.report },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    // SECURITY: never return the raw error message — pipeline errors may contain API keys
    console.error("[opportunity/analyze] pipeline error:", e);
    return NextResponse.json(
      { error: "Analysis failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
