/**
 * resolveZoning(districtCode) → ZoningResolution
 *
 * Two-tier lookup:
 *   Tier 1 — rules table  (lib/zoning/nycZoningRules.ts)
 *             provenance: "rules-table" on every field; version tagged.
 *             Accurate, auditable, zero network calls.
 *
 *   Tier 2 — fetched-unverified fallback
 *             Used only when the code is NOT in the table (overlays, special
 *             districts, unseeded codes).
 *             Attempts a best-effort scrape of the NYC Zoning Resolution.
 *             ALL values tagged provenance: "fetched-unverified".
 *             Marked needsManualConfirmation: true in the returned object.
 *             Returns null for any field that cannot be extracted confidently.
 *
 * Nothing is fabricated. If both tiers fail a field, value is null.
 */

import {
  NYC_ZONING_RULES,
  RULES_TABLE_VERSION,
  type ZoningDistrict,
} from "./nycZoningRules";

// ── Return types ─────────────────────────────────────────────────────────────

export type Provenance = "rules-table" | "fetched-unverified" | "derived";

export interface SourcedValue<T> {
  value: T | null;
  provenance: Provenance;
  /** Table version when provenance is "rules-table"; fetch URL when "fetched-unverified". */
  provenanceDetail: string;
}

export interface ZoningFAR {
  residential: SourcedValue<number>;
  commercial: SourcedValue<number>;
  communityFacility: SourcedValue<number>;
}

export interface ZoningResolution {
  /** The code that was looked up (normalized to uppercase). */
  district: string;
  /** Human name, if known. */
  districtName: string | null;
  far: ZoningFAR;
  maxHeight: SourcedValue<number>;
  maxBaseHeight: SourcedValue<number>;
  lotCoverage: SourcedValue<number>;
  heightRegime: SourcedValue<string>;
  allowedUseGroups: SourcedValue<string>;
  /**
   * Any C1/C2 commercial overlay applied on top of a residential base zone.
   * Populated only when the input code contains an overlay suffix, e.g. "R7A/C1-3".
   */
  overlays: string[];
  /**
   * true when any value came from "fetched-unverified" — signals the caller
   * that a human should cross-check the data before relying on it.
   */
  needsManualConfirmation: boolean;
  /** Human-readable caveats, notes from the rules table, and fetch warnings. */
  provenanceNotes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromTable<T>(value: T | null): SourcedValue<T> {
  return {
    value,
    provenance: "rules-table",
    provenanceDetail: `nycZoningRules v${RULES_TABLE_VERSION}`,
  };
}

function fromFetch<T>(value: T | null, url: string): SourcedValue<T> {
  return {
    value,
    provenance: "fetched-unverified",
    provenanceDetail: url,
  };
}

/** Parse the base district from codes like "R7A/C1-3" or "R7A C2-4". */
function parseDistrictAndOverlays(raw: string): {
  base: string;
  overlays: string[];
} {
  const parts = raw.trim().toUpperCase().split(/[\s/]+/);
  const base = parts[0];
  const overlays = parts.slice(1).filter(Boolean);
  return { base, overlays };
}

// ── Tier-1: table lookup ──────────────────────────────────────────────────────

function resolveFromTable(
  base: string,
  overlays: string[],
  notes: string[]
): ZoningResolution | null {
  const row: ZoningDistrict | undefined = NYC_ZONING_RULES[base];
  if (!row) return null;

  notes.push(...row.notes);
  if (overlays.length) {
    notes.push(
      `Commercial overlay(s) ${overlays.join(", ")} detected. Overlay rules (permitted uses, FAR) are additive and not included in base district values.`
    );
  }

  return {
    district: base,
    districtName: row.name,
    far: {
      residential: fromTable(row.residentialFAR),
      commercial: fromTable(row.commercialFAR),
      communityFacility: fromTable(row.communityFacilityFAR),
    },
    maxHeight: fromTable(row.maxBuildingHeight),
    maxBaseHeight: fromTable(row.maxBaseHeight),
    lotCoverage: fromTable(row.maxLotCoverage),
    heightRegime: fromTable(row.heightRegime),
    allowedUseGroups: fromTable(row.allowedUseGroups),
    overlays,
    needsManualConfirmation: false,
    provenanceNotes: notes,
  };
}

// ── Tier-2: fetched-unverified fallback ───────────────────────────────────────

/** Extract a number from a text snippet; returns null if not found. */
function extractNum(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const n = parseFloat(m[1]);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

/** Best-effort scrape of NYC Zoning Resolution for an unknown district code. */
async function resolveFromWeb(
  base: string,
  overlays: string[],
  notes: string[]
): Promise<ZoningResolution> {
  const searchUrl = `https://zr.planning.nyc.gov/article-ii/chapter-3`;
  let fetchedAny = false;
  let fetchUrl = searchUrl;

  let residentialFAR: number | null = null;
  let communityFAR: number | null = null;
  let commercialFAR: number | null = null;
  let maxHeight: number | null = null;
  let maxBase: number | null = null;

  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "BricksNexus/1.0 (pulipati.j@northeastern.edu)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const text = await res.text();
      fetchedAny = true;
      // Look for the district code in the page text, then try to extract numbers nearby
      const codeIdx = text.indexOf(base);
      if (codeIdx !== -1) {
        const snippet = text.slice(Math.max(0, codeIdx - 200), codeIdx + 800);
        residentialFAR = extractNum(snippet, [
          /residential\s+FAR[^0-9]*([0-9]+\.?[0-9]*)/i,
          /FAR[^0-9]*([0-9]+\.?[0-9]*)/i,
        ]);
        communityFAR = extractNum(snippet, [
          /community facility\s+FAR[^0-9]*([0-9]+\.?[0-9]*)/i,
        ]);
        maxHeight = extractNum(snippet, [
          /max(?:imum)?\s+height[^0-9]*([0-9]+)\s*(?:ft|feet)/i,
          /([0-9]+)\s*(?:ft|feet)\s+(?:height|tall)/i,
        ]);
        maxBase = extractNum(snippet, [
          /base\s+height[^0-9]*([0-9]+)\s*(?:ft|feet)/i,
          /street\s+wall[^0-9]*([0-9]+)\s*(?:ft|feet)/i,
        ]);
      }
    }
  } catch {
    // network failure — all values remain null
  }

  const anyFound = [residentialFAR, communityFAR, maxHeight, maxBase].some(
    (v) => v !== null
  );

  notes.push(
    fetchedAny
      ? `District "${base}" not found in rules table. Values fetched from ${fetchUrl} — UNVERIFIED. Confirm against https://zr.planning.nyc.gov before use.`
      : `District "${base}" not found in rules table and web fallback failed (network error). All values are null.`
  );
  if (!anyFound) {
    notes.push(
      `No numeric values could be extracted for "${base}". This may be a special district, an overlay, or a mapped district requiring manual lookup.`
    );
  }

  return {
    district: base,
    districtName: null,
    far: {
      residential: fromFetch(residentialFAR, fetchUrl),
      commercial: fromFetch(commercialFAR, fetchUrl),
      communityFacility: fromFetch(communityFAR, fetchUrl),
    },
    maxHeight: fromFetch(maxHeight, fetchUrl),
    maxBaseHeight: fromFetch(maxBase, fetchUrl),
    lotCoverage: fromFetch(null, fetchUrl),  // too context-dependent to scrape reliably
    heightRegime: fromFetch(null, fetchUrl),
    allowedUseGroups: fromFetch(null, fetchUrl),
    overlays,
    needsManualConfirmation: true,
    provenanceNotes: notes,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve zoning rules for a district code.
 *
 * @param districtCode  e.g. "R7A", "R6B", "C4-4", "R7A/C1-3"
 * @returns ZoningResolution with every field provenance-tagged.
 */
export async function resolveZoning(
  districtCode: string
): Promise<ZoningResolution> {
  const { base, overlays } = parseDistrictAndOverlays(districtCode);
  const notes: string[] = [];

  const fromTable = resolveFromTable(base, overlays, notes);
  if (fromTable) return fromTable;

  // Tier 2 — not in table; attempt web fallback
  return resolveFromWeb(base, overlays, notes);
}
