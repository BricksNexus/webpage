/**
 * NYC Zoning Rules Table — as-of-right baseline values.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EDIT HERE to add or update districts.                                  ║
 * ║                                                                          ║
 * ║  All values are as-of-right BASELINES. They EXCLUDE:                    ║
 * ║    • Inclusionary Housing (IH) / Affordable Independent Residences (IH) ║
 * ║    • Quality Housing bonuses                                             ║
 * ║    • Mandatory Inclusionary Housing (MIH) area bonuses                  ║
 * ║    • Any special district overrides (e.g. Special Hudson Yards, etc.)   ║
 * ║                                                                          ║
 * ║  Sources (verified):                                                     ║
 * ║    FAR (R districts):  NYC ZR §23-22, Table 1 (Sec. 23-211)            ║
 * ║    FAR (C districts):  NYC ZR §33-31, Table 1                           ║
 * ║    Community Fac FAR:  NYC ZR §24-11 (R), §33-201 (C)                  ║
 * ║    Heights (contextual R): NYC ZR §23-432, Table (as-of-right column)   ║
 * ║    Heights (C4-4, C6-2):  NYC ZR §33-432                                ║
 * ║    Lot coverage (R):   NYC ZR §23-141 / §23-145                         ║
 * ║    Lot coverage (C):   NYC ZR §33-291                                    ║
 * ║                                                                          ║
 * ║  Verify against the current NYC Zoning Resolution before relying on     ║
 * ║  these values for any legal or financial purpose:                        ║
 * ║    https://zr.planning.nyc.gov                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Field semantics:
 *   residentialFAR        — max residential floor area ratio (base, no bonus)
 *   commercialFAR         — max commercial FAR; null for pure R districts
 *   communityFacilityFAR  — max community-facility FAR
 *   maxBuildingHeight     — hard ceiling in feet; null = sky-exposure-plane rule applies (no hard limit)
 *   maxBaseHeight         — max street-wall height before setback required; null = no base-height rule
 *   maxLotCoverage        — fraction (0–1) of lot that may be covered; null = open-space-ratio rule applies
 *   heightRegime          — "contextual" = hard height cap; "sky-exposure-plane" = setback envelope applies
 *   allowedUseGroups      — plain-language summary of permitted uses
 *   notes                 — any important caveats or known null reasons
 */

export const RULES_TABLE_VERSION = "1.0";

export type HeightRegime = "contextual" | "sky-exposure-plane";

export interface ZoningDistrict {
  /** Full human-readable name */
  name: string;
  residentialFAR: number | null;
  commercialFAR: number | null;
  communityFacilityFAR: number | null;
  /** Hard height ceiling in feet. null = sky-exposure-plane regime; no hard cap. */
  maxBuildingHeight: number | null;
  /** Max street-wall height before setback is required. null = no base-height rule. */
  maxBaseHeight: number | null;
  /** 0–1 fraction. null = open-space-ratio rule applies instead. */
  maxLotCoverage: number | null;
  heightRegime: HeightRegime;
  allowedUseGroups: string;
  notes: string[];
}

/**
 * Keyed by the canonical district code (uppercase, as it appears on the NYC
 * zoning map and in MapPLUTO's zonedist1 field).
 *
 * ── ADD DISTRICTS HERE ──────────────────────────────────────────────────────
 */
export const NYC_ZONING_RULES: Record<string, ZoningDistrict> = {

  // ── R6 ────────────────────────────────────────────────────────────────────
  // Non-contextual (standard) mid-density residential.
  // No hard height limit — bulk controlled by sky-exposure plane.
  // Lot coverage: open-space-ratio rule applies (no fixed % cap for standard R6).
  R6: {
    name: "R6 — Medium-Density Residential",
    residentialFAR: 2.20,
    commercialFAR: null,
    communityFacilityFAR: 4.80,
    maxBuildingHeight: null,       // sky-exposure-plane governs
    maxBaseHeight: null,           // no base-height requirement in standard R6
    maxLotCoverage: null,          // governed by open-space ratio, not fixed %
    heightRegime: "sky-exposure-plane",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility) permitted",
    notes: [
      "No hard height ceiling; bulk shaped by sky-exposure plane starting at 60 ft above street line.",
      "Open-space ratio = 27.5 (interior lots) governs coverage rather than a fixed lot-coverage percent.",
      "R6 Quality Housing option available with different FAR/height rules (opt-in per §23-153).",
    ],
  },

  // ── R6A ───────────────────────────────────────────────────────────────────
  // Contextual — street-wall continuity required; hard height cap.
  R6A: {
    name: "R6A — Medium-Density Contextual Residential",
    residentialFAR: 3.00,
    commercialFAR: null,
    communityFacilityFAR: 3.00,
    maxBuildingHeight: 75,         // as-of-right; 95 ft with IH bonus
    maxBaseHeight: 65,             // min 40 ft required too (§23-662)
    maxLotCoverage: 0.70,          // 70 % interior lots
    heightRegime: "contextual",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "Street-wall continuity and base-height envelope required (contextual district).",
      "75 ft hard cap is as-of-right; affordable-housing bonus raises it to 95 ft.",
      "Community facility FAR capped at 3.0, matching residential FAR (§24-11 contextual cap).",
    ],
  },

  // ── R6B ───────────────────────────────────────────────────────────────────
  // Contextual — lower density; preserves 3–4-story rowhouse character.
  R6B: {
    name: "R6B — Lower-Medium-Density Contextual Residential",
    residentialFAR: 2.00,
    commercialFAR: null,
    communityFacilityFAR: 2.00,
    maxBuildingHeight: 45,         // as-of-right; 65 ft with IH bonus
    maxBaseHeight: 30,             // min 25 ft required (§23-662)
    maxLotCoverage: 0.65,
    heightRegime: "contextual",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "Designed to preserve brownstone/rowhouse neighborhoods.",
      "45 ft hard cap as-of-right; 65 ft with affordable-housing bonus.",
    ],
  },

  // ── R7A ───────────────────────────────────────────────────────────────────
  // Contextual — medium-high density; common in upper Manhattan.
  R7A: {
    name: "R7A — Medium-High-Density Contextual Residential",
    residentialFAR: 4.00,
    commercialFAR: null,
    communityFacilityFAR: 4.00,
    maxBuildingHeight: 75,         // as-of-right; 115 ft with IH bonus
    maxBaseHeight: 40,             // min 30 ft required (§23-662); varies by street width
    maxLotCoverage: 0.65,
    heightRegime: "contextual",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "75 ft hard cap is as-of-right; affordable-housing bonus raises it to 115 ft.",
      "Base height 40 ft on narrow streets, 65 ft on wide streets (§23-662).",
      "Community facility FAR capped at 4.0 (same as residential) in contextual districts.",
    ],
  },

  // ── R7-2 ──────────────────────────────────────────────────────────────────
  // Non-contextual (standard) medium-high density.
  // Sky-exposure-plane governs; harder to build tall efficiently than R7A.
  "R7-2": {
    name: "R7-2 — Medium-High-Density Residential (Standard)",
    residentialFAR: 3.44,
    commercialFAR: null,
    communityFacilityFAR: 6.50,
    maxBuildingHeight: null,       // sky-exposure-plane; no hard cap
    maxBaseHeight: null,
    maxLotCoverage: null,          // open-space-ratio rule applies
    heightRegime: "sky-exposure-plane",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "Sky-exposure-plane starts at 60 ft above street line (narrow street) or 70 ft (wide).",
      "Lower residential FAR (3.44) than contextual R7A (4.0) despite similar density intent.",
      "Community facility FAR is notably higher (6.50) — commonly used for hospitals/schools.",
    ],
  },

  // ── R8 ────────────────────────────────────────────────────────────────────
  // Non-contextual high-density; sky-exposure-plane; common near major avenues.
  R8: {
    name: "R8 — High-Density Residential (Standard)",
    residentialFAR: 6.02,
    commercialFAR: null,
    communityFacilityFAR: 6.50,
    maxBuildingHeight: null,       // sky-exposure-plane
    maxBaseHeight: null,
    maxLotCoverage: null,          // open-space-ratio governs
    heightRegime: "sky-exposure-plane",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "FAR 6.02 on narrow streets; 7.20 within 100 ft of a wide street (§23-22).",
      "No hard height ceiling — sky-exposure-plane starts at 60–85 ft depending on street width.",
      "Quality Housing option available with FAR up to 6.02 and different height rules.",
    ],
  },

  // ── R8A ───────────────────────────────────────────────────────────────────
  // Contextual high-density; hard height cap.
  R8A: {
    name: "R8A — High-Density Contextual Residential",
    residentialFAR: 6.02,
    commercialFAR: null,
    communityFacilityFAR: 6.50,
    maxBuildingHeight: 95,         // as-of-right; 145 ft with IH bonus
    maxBaseHeight: 60,             // min 40 ft required (§23-662)
    maxLotCoverage: 0.70,
    heightRegime: "contextual",
    allowedUseGroups: "Use Groups 1–2 (residential); UG 3–4 (community facility)",
    notes: [
      "Same FAR as standard R8 but with hard height cap and contextual street-wall rules.",
      "95 ft as-of-right; affordable-housing bonus raises it to 145 ft.",
    ],
  },

  // ── C4-4 ──────────────────────────────────────────────────────────────────
  // General commercial — regional shopping centers and mixed-use corridors.
  // Mapped districts include commercial FAR; residential use requires C4 equivalence.
  "C4-4": {
    name: "C4-4 — General Commercial (Regional Center)",
    residentialFAR: 3.44,          // R7-2 equivalent residential FAR (§35-23)
    commercialFAR: 3.40,
    communityFacilityFAR: 6.50,
    maxBuildingHeight: null,       // tower-on-a-base rules apply; no single hard ceiling
    maxBaseHeight: 60,             // street-wall max before setback (§33-432)
    maxLotCoverage: 0.40,
    heightRegime: "sky-exposure-plane",
    allowedUseGroups: "Use Groups 1–6, 9–11 (retail, offices, residential); some UG 12 with special permit",
    notes: [
      "Commercial FAR 3.40 per §35-31 Table 1.",
      "Residential use is permitted at R7-2 equivalent FAR (3.44) per §35-23.",
      "No single hard building-height ceiling — sky-exposure-plane + base-height envelope.",
      "Lot coverage 40% per §33-291; higher coverage possible with open space tradeoff.",
    ],
  },

  // ── C6-2 ──────────────────────────────────────────────────────────────────
  // High-density central commercial; mixed-use towers; common in Midtown and Downtown Brooklyn.
  "C6-2": {
    name: "C6-2 — High-Density Central Commercial",
    residentialFAR: 6.02,          // R8 equivalent residential FAR (§35-23)
    commercialFAR: 6.00,
    communityFacilityFAR: 6.50,
    maxBuildingHeight: null,       // no hard cap; sky-exposure-plane applies
    maxBaseHeight: 85,             // street-wall max before setback (§33-432)
    maxLotCoverage: 0.40,
    heightRegime: "sky-exposure-plane",
    allowedUseGroups: "Use Groups 1–6, 9–12 (high-density retail, offices, hotels, residential)",
    notes: [
      "Commercial FAR 6.0 per §35-31 Table 1.",
      "Residential use permitted at R8 equivalent FAR (6.02) per §35-23.",
      "No hard height ceiling — sky-exposure-plane applies above 85 ft street wall.",
      "Lot coverage 40% standard; §33-455 allows 55% under specific conditions.",
    ],
  },

};

/** All district codes present in the table. */
export const SEEDED_DISTRICTS = Object.keys(NYC_ZONING_RULES) as Array<
  keyof typeof NYC_ZONING_RULES
>;
