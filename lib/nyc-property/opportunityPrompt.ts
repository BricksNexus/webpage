/**
 * Gemini prompt builder and response parser for opportunity analysis.
 *
 * Strict JSON output only — model is instructed explicitly.
 * Code fences are stripped before parsing.
 * Unparseable response degrades gracefully to opportunities: [].
 *
 * FRAMING RULES enforced in system prompt:
 *  - Every finding is an "investigate-lead," never a legal determination.
 *  - Language: "potential for ~N additional units, subject to verification."
 *  - Must include "confirm with NYC DOB / Dept of City Planning" caveat.
 *  - Must NOT assert legal entitlements.
 *  - Must NOT invent zoning figures — reason only from provided numbers.
 */

import type { CanonicalProperty } from "./mergeProperty";
import type { ZoningResolution } from "../zoning/resolveZoning";
import type { AnalysisContext } from "./analysisContext";
import { getLlmChatConfig } from "../llm-chat";

// ── Opportunity shape ─────────────────────────────────────────────────────────

export interface Opportunity {
  title: string;
  summary: string;
  /** Which rule, stat, or number this finding derives from. */
  basedOn: string;
  confidence: "low" | "med" | "high";
  caveats: string[];
  nextSteps: string[];
}

export interface LlmAnalysisResult {
  opportunities: Opportunity[];
  /** Non-null when the LLM call or JSON parse failed. */
  llmError: string | null;
  modelUsed: string | null;
}

// ── Prompt construction ───────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a NYC real estate development researcher producing INVESTIGATE LEADS — not legal determinations.

STRICT RULES (violation = invalid response):
1. Return ONLY a raw JSON object. No markdown, no prose, no code fences, no explanation outside the JSON.
2. Every opportunity is a lead to investigate, never a guaranteed entitlement. Use language like "potential for ~N additional units, subject to verification" — never "you can build X."
3. Every opportunity MUST include at least one caveat stating "Confirm with NYC Department of Buildings and Dept of City Planning before acting on this lead."
4. Do NOT invent or estimate zoning numbers. Use ONLY the figures provided in the context object. If a required number is null, say so in the caveat and set confidence to "low."
5. Derive confidence from data completeness: high = all inputs present and sources are rules-table; med = one or two inputs from fallback/unverified; low = key inputs null or district is unverified.

OUTPUT SCHEMA (strict — no extra fields, no omitted required fields):
{
  "opportunities": [
    {
      "title": "string — concise label (max 60 chars)",
      "summary": "string — 2-4 sentences. Plain language. Quantify where possible (e.g. '~8 additional units'). Frame as investigate-lead.",
      "basedOn": "string — name the specific rule or number (e.g. 'R7A residential FAR 4.0, remaining capacity 4,233 sq ft')",
      "confidence": "low" | "med" | "high",
      "caveats": ["string", ...],
      "nextSteps": ["string — specific actionable step", ...]
    }
  ]
}

Produce 2–5 opportunities. If the data does not support any credible lead, return { "opportunities": [] }.`;
}

function buildUserMessage(
  address: string,
  property: CanonicalProperty,
  zoning: ZoningResolution,
  math: AnalysisContext
): string {
  // Helper to extract value safely for display
  const v = (x: { value: unknown } | null | undefined) =>
    x?.value ?? "null";

  return `Analyze this NYC property for development opportunities. Use ONLY the numbers below.

## Property
Address: ${address}
BBL: ${v(property.bbl)} (Borough ${v(property.borough)}, Block ${v(property.block)}, Lot ${v(property.lot)})
Owner: ${v(property.owner)}
Building class: ${v(property.buildingClass.code)} — ${v(property.buildingClass.label)}
Tax class: ${v(property.taxClass)}
Year built: ${v(property.yearBuilt)}
Stories: ${v(property.numStories)}
Total units: ${v(property.totalUnits)} (${v(property.residentialUnits)} res + ${v(property.commercialUnits)} commercial)
Total building area: ${v(property.totalArea)} sq ft
Residential area: ${v(property.residentialArea)} sq ft
Commercial area: ${v(property.commercialArea)} sq ft
Building frontage × depth: ${v(property.buildingFrontage)} ft × ${v(property.buildingDepth)} ft
Land frontage × depth: ${v(property.land.frontage)} ft × ${v(property.land.depth)} ft
Land area: ${v(property.land.area)} sq ft

## Zoning
District: ${zoning.district} (${zoning.districtName ?? "name not in rules table"})
Height regime: ${v(zoning.heightRegime)}
Residential FAR (as-of-right, base): ${v(zoning.far.residential)}
Commercial FAR: ${v(zoning.far.commercial)}
Community facility FAR: ${v(zoning.far.communityFacility)}
Max building height (ft, as-of-right): ${v(zoning.maxHeight)}
Max base height (ft): ${v(zoning.maxBaseHeight)}
Max lot coverage: ${zoning.lotCoverage.value != null ? Math.round(zoning.lotCoverage.value * 100) + "%" : "null (open-space-ratio rule applies)"}
Allowed uses: ${v(zoning.allowedUseGroups)}
Needs manual confirmation: ${zoning.needsManualConfirmation}
Provenance notes: ${zoning.provenanceNotes.join(" | ")}

## Computed Baseline Math (code-derived, auditable)
Lot area: ${math.lotAreaSqFt.formula}
Existing area: ${math.existingAreaSqFt.formula}
Residential FAR used: ${math.residentialFAR.formula}
Max buildable area: ${math.maxBuildableArea.formula}${math.maxBuildableArea.nullReason ? ` [NULL: ${math.maxBuildableArea.nullReason}]` : ""}
Remaining FAR capacity: ${math.remainingCapacity.formula}${math.remainingCapacity.nullReason ? ` [NULL: ${math.remainingCapacity.nullReason}]` : ""}
Existing stories: ${math.existingStories.formula}
Max implied stories: ${math.maxImpliedStories.formula}${math.maxImpliedStories.nullReason ? ` [NULL: ${math.maxImpliedStories.nullReason}]` : ""}
Story headroom: ${math.storyHeadroom.formula}${math.storyHeadroom.nullReason ? ` [NULL: ${math.storyHeadroom.nullReason}]` : ""}
Potential additional units (est.): ${math.potentialAdditionalUnits.formula}
Current lot coverage ratio: ${math.currentLotCoverageRatio.formula}${math.currentLotCoverageRatio.nullReason ? ` [NULL: ${math.currentLotCoverageRatio.nullReason}]` : ""}
Max lot coverage ratio: ${math.maxLotCoverageRatio.formula}${math.maxLotCoverageRatio.nullReason ? ` [NULL: ${math.maxLotCoverageRatio.nullReason}]` : ""}
Lot coverage headroom: ${math.lotCoverageHeadroom.formula}${math.lotCoverageHeadroom.nullReason ? ` [NULL: ${math.lotCoverageHeadroom.nullReason}]` : ""}

Return ONLY the JSON object — no other text.`;
}

// ── Code-fence stripper ───────────────────────────────────────────────────────

function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// ── Opportunity validator ─────────────────────────────────────────────────────

function isValidOpportunity(o: unknown): o is Opportunity {
  if (typeof o !== "object" || o === null) return false;
  const obj = o as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.summary === "string" &&
    typeof obj.basedOn === "string" &&
    ["low", "med", "high"].includes(obj.confidence as string) &&
    Array.isArray(obj.caveats) &&
    Array.isArray(obj.nextSteps)
  );
}

// ── Main call ─────────────────────────────────────────────────────────────────

export async function callOpportunityAnalysis(
  address: string,
  property: CanonicalProperty,
  zoning: ZoningResolution,
  math: AnalysisContext
): Promise<LlmAnalysisResult> {
  const llm = getLlmChatConfig();
  if (!llm) {
    return {
      opportunities: [],
      llmError: "No LLM configured (GOOGLE_GENERATIVE_AI_API_KEY or OPENROUTER_API_KEY not set).",
      modelUsed: null,
    };
  }

  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserMessage(address, property, zoning, math) },
  ];

  let rawText = "";
  let modelUsed: string | null = null;

  try {
    const res = await fetch(llm.url, {
      method: "POST",
      headers: llm.headers,
      body: JSON.stringify({
        model: llm.defaultModel,
        messages,
        temperature: 0.2,     // low temp for structured/numeric reasoning
        max_tokens: 3200,
        response_format: { type: "json_object" }, // supported by Gemini & OpenAI
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        opportunities: [],
        llmError: `LLM HTTP ${res.status}: ${errText.slice(0, 400)}`,
        modelUsed: null,
      };
    }

    const data = await res.json();
    modelUsed = data?.model ?? llm.defaultModel;
    rawText = data?.choices?.[0]?.message?.content ?? "";
  } catch (e: unknown) {
    return {
      opportunities: [],
      llmError: `LLM fetch error: ${(e as Error).message}`,
      modelUsed: null,
    };
  }

  // Parse — strip fences, try JSON.parse, validate shape
  try {
    const cleaned = stripCodeFences(rawText);
    const parsed = JSON.parse(cleaned) as { opportunities?: unknown[] };
    const raw = Array.isArray(parsed?.opportunities) ? parsed.opportunities : [];
    const opportunities = raw.filter(isValidOpportunity);

    if (opportunities.length === 0 && raw.length > 0) {
      return {
        opportunities: [],
        llmError: `LLM returned ${raw.length} opportunities but none passed schema validation. Raw sample: ${JSON.stringify(raw[0]).slice(0, 300)}`,
        modelUsed,
      };
    }

    return { opportunities, llmError: null, modelUsed };
  } catch (e: unknown) {
    return {
      opportunities: [],
      llmError: `JSON parse failed: ${(e as Error).message}. Raw (first 400 chars): ${rawText.slice(0, 400)}`,
      modelUsed,
    };
  }
}
