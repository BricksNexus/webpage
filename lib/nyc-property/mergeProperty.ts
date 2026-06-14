/**
 * Cross-validation merge: PLUTO + ATTOM → canonical property object.
 *
 * Canonical source rules:
 *   PLUTO wins: zoningDistrict, lotArea, lotDimensions, units, buildingClass,
 *               yearBuilt, stories, residentialArea, commercialArea,
 *               taxClass, numBuildings, buildingFrontage, buildingDepth
 *   ATTOM wins: ownerName (PLUTO ownername is often stale/abbreviated),
 *               saleDate, saleAmount, constructionType, buildingStyle
 *
 * Cross-validation fields (both sources carry them — compare and flag):
 *   yearBuilt, numStories, totalUnits, totalAreaSqFt, lotAreaSqFt
 *
 * Tolerance for numeric comparison: within 5% or 50 sq ft (whichever is larger).
 */

import type { AttomPropertyData } from "./attom";
import type { PlutoPropertyData } from "./pluto";
import type { GeoSearchResult } from "./geosearch";

// ── Sourced value wrapper ────────────────────────────────────────────────────

export type Source = "pluto" | "attom" | "geosearch" | "derived";

export interface Sourced<T> {
  value: T | null;
  source: Source;
}

function from<T>(value: T | null, source: Source): Sourced<T> {
  return { value, source };
}

// ── Conflict / missing tracking ──────────────────────────────────────────────

export interface Conflict {
  field: string;
  attom: unknown;
  pluto: unknown;
}

export interface DataQuality {
  conflicts: Conflict[];
  missing: string[];
  /** Fields present in only one source (informational, not an error) */
  singleSource: string[];
  attomAvailable: boolean;
  plutoAvailable: boolean;
}

// ── Numeric cross-validation ─────────────────────────────────────────────────

function numericAgree(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return true; // can't disagree if one is absent
  const tolerance = Math.max(50, Math.min(a, b) * 0.05);
  return Math.abs(a - b) <= tolerance;
}

function crossValidateNum(
  field: string,
  attomVal: number | null,
  plutoVal: number | null,
  conflicts: Conflict[],
  singleSource: string[]
): void {
  if (attomVal == null && plutoVal == null) return;
  if (attomVal == null || plutoVal == null) {
    singleSource.push(field);
    return;
  }
  if (!numericAgree(attomVal, plutoVal)) {
    conflicts.push({ field, attom: attomVal, pluto: plutoVal });
  }
}

// ── Canonical property shape ─────────────────────────────────────────────────

export interface CanonicalProperty {
  // Identity
  address: Sourced<string>;
  bbl: Sourced<string>;
  borough: Sourced<string>;
  block: Sourced<string>;
  lot: Sourced<string>;

  // Ownership & sale (ATTOM wins)
  owner: Sourced<string>;
  saleDate: Sourced<string>;
  saleAmount: Sourced<number>;

  // Classification (PLUTO wins)
  buildingClass: {
    code: Sourced<string>;
    label: Sourced<string>;
  };
  taxClass: Sourced<string>;
  zoningDistrict: Sourced<string>;

  // Building counts (PLUTO wins)
  numBuildings: Sourced<number>;
  yearBuilt: Sourced<number>;
  numStories: Sourced<number>;
  totalUnits: Sourced<number>;
  residentialUnits: Sourced<number>;
  commercialUnits: Sourced<number>;

  // Areas (PLUTO wins for breakdown; cross-validated on total)
  totalArea: Sourced<number>;
  residentialArea: Sourced<number>;
  commercialArea: Sourced<number>;

  // Building physical (PLUTO wins)
  buildingFrontage: Sourced<number>;
  buildingDepth: Sourced<number>;

  // Construction details (ATTOM wins)
  buildingStyle: Sourced<string>;
  constructionType: Sourced<string>;

  // Land (PLUTO wins for breakdown; cross-validated on area)
  land: {
    frontage: Sourced<number>;
    depth: Sourced<number>;
    area: Sourced<number>;
  };
}

// ── Merge function ───────────────────────────────────────────────────────────

export function mergeProperty(
  geo: GeoSearchResult,
  attom: AttomPropertyData | null,
  pluto: PlutoPropertyData | null
): { property: CanonicalProperty; dataQuality: DataQuality } {
  const conflicts: Conflict[] = [];
  const missing: string[] = [];
  const singleSource: string[] = [];

  // Cross-validate numeric fields present in both sources
  if (attom && pluto) {
    crossValidateNum("yearBuilt",    attom.yearBuilt,    pluto.yearBuilt,    conflicts, singleSource);
    crossValidateNum("numStories",   attom.numStories,   pluto.numStories,   conflicts, singleSource);
    crossValidateNum("totalUnits",   attom.totalUnits,   pluto.totalUnits,   conflicts, singleSource);
    crossValidateNum("totalAreaSqFt",attom.totalAreaSqFt,pluto.totalAreaSqFt,conflicts, singleSource);
    crossValidateNum("lotAreaSqFt",  attom.lotAreaSqFt,  pluto.lotAreaSqFt,  conflicts, singleSource);
    crossValidateNum("lotFrontage",  attom.lotFrontage,  pluto.lotFrontage,  conflicts, singleSource);
    crossValidateNum("lotDepth",     attom.lotDepth,     pluto.lotDepth,     conflicts, singleSource);
  }

  // Helper: track missing fields
  function required<T>(value: T | null, fieldName: string, source: Source): Sourced<T> {
    if (value == null) missing.push(fieldName);
    return from(value, source);
  }

  // ── Build canonical object ─────────────────────────────────────────────────

  // Owner: ATTOM preferred (more current), fall back to PLUTO
  const ownerValue =
    attom?.ownerName ??
    pluto?.ownerName ??
    null;
  const ownerSource: Source =
    attom?.ownerName ? "attom" : pluto?.ownerName ? "pluto" : "pluto";

  const property: CanonicalProperty = {
    // Identity — all from GeoSearch
    address:  from(geo.label, "geosearch"),
    bbl:      from(geo.bbl, "geosearch"),
    borough:  from(geo.borough, "geosearch"),
    block:    from(geo.block, "geosearch"),
    lot:      from(geo.lot, "geosearch"),

    // Ownership
    owner:      required(ownerValue, "owner", ownerSource),
    saleDate:   from(attom?.saleDate ?? null, "attom"),
    saleAmount: from(attom?.saleAmount ?? null, "attom"),

    // Classification — PLUTO wins
    buildingClass: {
      code:  required(pluto?.buildingClassCode ?? null, "buildingClass.code", "pluto"),
      label: from(pluto?.buildingClassLabel ?? null, "pluto"),
    },
    taxClass:       required(pluto?.taxClass ?? null, "taxClass", "pluto"),
    zoningDistrict: required(pluto?.zoningDistrict ?? null, "zoningDistrict", "pluto"),

    // Building counts — PLUTO wins
    numBuildings:     required(pluto?.numBuildings ?? null, "numBuildings", "pluto"),
    yearBuilt:        required(pluto?.yearBuilt ?? attom?.yearBuilt ?? null, "yearBuilt", pluto?.yearBuilt != null ? "pluto" : "attom"),
    numStories:       required(pluto?.numStories ?? attom?.numStories ?? null, "numStories", pluto?.numStories != null ? "pluto" : "attom"),
    totalUnits:       required(pluto?.totalUnits ?? attom?.totalUnits ?? null, "totalUnits", pluto?.totalUnits != null ? "pluto" : "attom"),
    residentialUnits: required(pluto?.residentialUnits ?? null, "residentialUnits", "pluto"),
    commercialUnits:  from(pluto?.commercialUnits ?? null, "derived"),

    // Areas — PLUTO wins
    totalArea:       required(pluto?.totalAreaSqFt ?? attom?.totalAreaSqFt ?? null, "totalArea", pluto?.totalAreaSqFt != null ? "pluto" : "attom"),
    residentialArea: from(pluto?.residentialAreaSqFt ?? null, "pluto"),
    commercialArea:  from(pluto?.commercialAreaSqFt ?? null, "pluto"),

    // Building physical — PLUTO wins
    buildingFrontage: from(pluto?.buildingFrontage ?? null, "pluto"),
    buildingDepth:    from(pluto?.buildingDepth ?? null, "pluto"),

    // Construction details — ATTOM wins
    buildingStyle:    from(attom?.buildingStyle ?? null, "attom"),
    constructionType: from(attom?.constructionType ?? null, "attom"),

    // Land — PLUTO wins
    land: {
      frontage: from(pluto?.lotFrontage ?? attom?.lotFrontage ?? null, pluto?.lotFrontage != null ? "pluto" : "attom"),
      depth:    from(pluto?.lotDepth ?? attom?.lotDepth ?? null, pluto?.lotDepth != null ? "pluto" : "attom"),
      area:     required(pluto?.lotAreaSqFt ?? attom?.lotAreaSqFt ?? null, "land.area", pluto?.lotAreaSqFt != null ? "pluto" : "attom"),
    },
  };

  return {
    property,
    dataQuality: {
      conflicts,
      missing,
      singleSource,
      attomAvailable: attom !== null,
      plutoAvailable: pluto !== null,
    },
  };
}
