/**
 * GET /api/opportunity-report/[id]
 *
 * Retrieves a previously generated and persisted opportunity report from KV.
 * Reports expire after 90 days.
 *
 * Response: the full report JSON as stored, or 404 if not found / expired.
 */

import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/api-cors";
import { kvGet } from "@/lib/kv";

export const maxDuration = 10;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { error: "Invalid report ID format." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const report = await kvGet(`report:${id}`);

    if (report == null) {
      return NextResponse.json(
        { error: `Report ${id} not found or expired.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, ...(report as object) },
      { headers: CORS_HEADERS }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error)?.message ?? "Report retrieval failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
