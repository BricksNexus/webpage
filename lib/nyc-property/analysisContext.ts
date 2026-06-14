/**
 * Deterministic baseline math for a NYC property opportunity report.
 *
 * All calculations are done in code, NOT by the LLM. Each derived value
 * carries the formula string used, so results are fully auditable.
 *
 * If a required input is null, the derived value is set to null with a
 * `nullReason` explaining which upstream field was missing.
 *
 * Formulas reference NYC Zoning Resolution conventions:
 *   Buildable area = Lot area (sq ft) × Residential FAR
 *   Remaining capacity = Max buildable area − Existing building area
 *   Stories headroom = Max building height (ft) / Assumed floor-to-floor height
 *                      − Existing stories
 */

import type { CanonicalProperty } from "./mergeProperty";
import type { ZoningResolution } from "../zoning/resolveZoning";

// Assumed floor-to-floor height for residential buildings in NYC (ft).
// Industry standard for mid-rise multifamily. Auditable constant.
const FLOOR_HEIGHT_FT = 10;

export interface ComputedValue {
  value: number | null;
  formula: string;
  nullReason?: string;
}

export interface AnalysisContext {
  /** Lot area used as input (sq ft). */
  lotAreaSqFt: ComputedValue;
  /** Existing above-grade building area (sq ft). */
  existingAreaSqFt: ComputedValue;
  /** Residential FAR from the zoning resolution. */
  residentialFAR: ComputedValue;
  /** Maximum buildable residential area as-of-right (sq ft). */
  maxBuildableArea: ComputedValue;
  /** Remaining floor-area capacity (sq ft). Negative = already over FAR. */
  remainingCapacity: ComputedValue;
  /** Current number of stories per PLUTO. */
  existingStories: ComputedValue;
  /** Maximum stories implied by the as-of-right height cap. */
  maxImpliedStories: ComputedValue;
  /** Story headroom: max implied stories − existing stories. */
  storyHeadroom: ComputedValue;
  /** Approximate additional units possible from remaining FAR capacity.
   *  Assumes 850 sq ft average unit size (NYC mid-market baseline). */
  potentialAdditionalUnits: ComputedValue;
  /** Current lot coverage ratio (existing footprint ÷ lot area). */
  currentLotCoverageRatio: ComputedValue;
  /** Maximum permitted lot coverage from zoning rules. */
  maxLotCoverageRatio: ComputedValue;
  /** Spare lot coverage fraction available. */
  lotCoverageHeadroom: ComputedValue;
}

// Average unit floor area assumption for "potential units" estimate.
const AVG_UNIT_SQ_FT = 850;

function derived(
  value: number | null,
  formula: string,
  nullReason?: string
): ComputedValue {
  return { value, formula, ...(nullReason ? { nullReason } : {}) };
}

function nulled(formula: string, reason: string): ComputedValue {
  return { value: null, formula, nullReason: reason };
}

export function computeAnalysisContext(
  property: CanonicalProperty,
  zoning: ZoningResolution
): AnalysisContext {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  const lotArea = property.land.area.value;
  const existingArea = property.totalArea.value;
  const resFAR = zoning.far.residential.value;
  const maxHeightFt = zoning.maxHeight.value;
  const existingStoriesRaw = property.numStories.value;
  const maxLotCovFraction = zoning.lotCoverage.value; // already 0–1 in rules table

  // ── Step 1: Lot area ────────────────────────────────────────────────────────
  const lotAreaVal = derived(
    lotArea,
    "land.area.value (from PLUTO lot area sq ft)",
    lotArea == null ? "PLUTO lot area not available" : undefined
  );

  // ── Step 2: Existing area ───────────────────────────────────────────────────
  const existingAreaVal = derived(
    existingArea,
    "property.totalArea.value (PLUTO bldgarea sq ft)",
    existingArea == null ? "PLUTO building area not available" : undefined
  );

  // ── Step 3: Residential FAR ─────────────────────────────────────────────────
  const resFARVal = derived(
    resFAR,
    `zoning.far.residential.value from rules-table district ${zoning.district}`,
    resFAR == null ? "Residential FAR not found for district" : undefined
  );

  // ── Step 4: Max buildable area ──────────────────────────────────────────────
  let maxBuildable: number | null = null;
  let maxBuildableFormula = "lot_area_sq_ft × residential_FAR";
  let maxBuildableNull: string | undefined;
  if (lotArea != null && resFAR != null) {
    maxBuildable = Math.round(lotArea * resFAR);
    maxBuildableFormula = `${lotArea} sq_ft × ${resFAR} FAR = ${maxBuildable} sq_ft`;
  } else {
    maxBuildableNull =
      lotArea == null ? "lot area is null" : "residential FAR is null";
  }
  const maxBuildableVal = derived(maxBuildable, maxBuildableFormula, maxBuildableNull);

  // ── Step 5: Remaining capacity ──────────────────────────────────────────────
  let remaining: number | null = null;
  let remainingFormula = "max_buildable_area − existing_area";
  let remainingNull: string | undefined;
  if (maxBuildable != null && existingArea != null) {
    remaining = Math.round(maxBuildable - existingArea);
    remainingFormula = `${maxBuildable} sq_ft − ${existingArea} sq_ft = ${remaining} sq_ft`;
  } else {
    remainingNull =
      maxBuildable == null ? "max buildable area is null" : "existing area is null";
  }
  const remainingVal = derived(remaining, remainingFormula, remainingNull);

  // ── Step 6: Existing stories ────────────────────────────────────────────────
  const existingStoriesVal = derived(
    existingStoriesRaw,
    "property.numStories.value (from PLUTO numfloors)",
    existingStoriesRaw == null ? "PLUTO story count not available" : undefined
  );

  // ── Step 7: Max implied stories ─────────────────────────────────────────────
  let maxImplied: number | null = null;
  let maxImpliedFormula = `max_height_ft / ${FLOOR_HEIGHT_FT} ft_per_floor`;
  let maxImpliedNull: string | undefined;
  if (maxHeightFt != null) {
    maxImplied = Math.floor(maxHeightFt / FLOOR_HEIGHT_FT);
    maxImpliedFormula = `${maxHeightFt} ft ÷ ${FLOOR_HEIGHT_FT} ft/floor = ${maxImplied} floors`;
  } else {
    maxImpliedNull =
      "Sky-exposure-plane district — no hard height cap; story estimate not computable";
  }
  const maxImpliedVal = derived(maxImplied, maxImpliedFormula, maxImpliedNull);

  // ── Step 8: Story headroom ──────────────────────────────────────────────────
  let headroom: number | null = null;
  let headroomFormula = "max_implied_stories − existing_stories";
  let headroomNull: string | undefined;
  if (maxImplied != null && existingStoriesRaw != null) {
    headroom = maxImplied - existingStoriesRaw;
    headroomFormula = `${maxImplied} max_implied − ${existingStoriesRaw} existing = ${headroom} floors`;
  } else {
    headroomNull =
      maxImplied == null
        ? "max implied stories not computable (no hard height cap)"
        : "existing story count is null";
  }
  const storyHeadroomVal = derived(headroom, headroomFormula, headroomNull);

  // ── Step 9: Potential additional units ─────────────────────────────────────
  let potentialUnits: number | null = null;
  let potentialUnitsFormula = `floor(remaining_capacity / ${AVG_UNIT_SQ_FT} sq_ft_per_unit)`;
  let potentialUnitsNull: string | undefined;
  if (remaining != null && remaining > 0) {
    potentialUnits = Math.floor(remaining / AVG_UNIT_SQ_FT);
    potentialUnitsFormula =
      `floor(${remaining} sq_ft ÷ ${AVG_UNIT_SQ_FT} sq_ft/unit) = ~${potentialUnits} units`;
  } else if (remaining != null && remaining <= 0) {
    potentialUnits = 0;
    potentialUnitsFormula = `Remaining capacity is ${remaining} sq_ft — already at or over FAR limit`;
  } else {
    potentialUnitsNull = "remaining capacity is null";
  }
  const potentialUnitsVal = derived(
    potentialUnits,
    potentialUnitsFormula,
    potentialUnitsNull
  );

  // ── Step 10: Lot coverage ratios ────────────────────────────────────────────
  // Approximate footprint from building area ÷ stories (rough; not from PLUTO directly)
  let currentCoverage: number | null = null;
  let currentCoverageFormula = "(existing_area / num_stories) / lot_area";
  let currentCoverageNull: string | undefined;
  if (existingArea != null && existingStoriesRaw != null && existingStoriesRaw > 0 && lotArea != null) {
    const footprint = existingArea / existingStoriesRaw;
    currentCoverage = parseFloat((footprint / lotArea).toFixed(3));
    currentCoverageFormula =
      `(${existingArea} sq_ft ÷ ${existingStoriesRaw} floors) ÷ ${lotArea} sq_ft = ${currentCoverage}`;
  } else {
    currentCoverageNull = "cannot compute: missing existing area, stories, or lot area";
  }
  const currentCoverageVal = derived(
    currentCoverage,
    currentCoverageFormula,
    currentCoverageNull
  );

  const maxLotCovVal = derived(
    maxLotCovFraction,
    `zoning.lotCoverage.value from rules-table district ${zoning.district}`,
    maxLotCovFraction == null
      ? "Lot coverage governed by open-space-ratio rule; no fixed fraction in rules table"
      : undefined
  );

  let coverageHeadroom: number | null = null;
  let coverageHeadroomFormula = "max_lot_coverage − current_lot_coverage";
  let coverageHeadroomNull: string | undefined;
  if (maxLotCovFraction != null && currentCoverage != null) {
    coverageHeadroom = parseFloat((maxLotCovFraction - currentCoverage).toFixed(3));
    coverageHeadroomFormula = `${maxLotCovFraction} − ${currentCoverage} = ${coverageHeadroom}`;
  } else {
    coverageHeadroomNull =
      maxLotCovFraction == null
        ? "max lot coverage not available"
        : "current lot coverage not computable";
  }
  const coverageHeadroomVal = derived(
    coverageHeadroom,
    coverageHeadroomFormula,
    coverageHeadroomNull
  );

  return {
    lotAreaSqFt: lotAreaVal,
    existingAreaSqFt: existingAreaVal,
    residentialFAR: resFARVal,
    maxBuildableArea: maxBuildableVal,
    remainingCapacity: remainingVal,
    existingStories: existingStoriesVal,
    maxImpliedStories: maxImpliedVal,
    storyHeadroom: storyHeadroomVal,
    potentialAdditionalUnits: potentialUnitsVal,
    currentLotCoverageRatio: currentCoverageVal,
    maxLotCoverageRatio: maxLotCovVal,
    lotCoverageHeadroom: coverageHeadroomVal,
  };
}
