/**
 * Dev-only test: resolves a zoning district code and pretty-prints the result.
 * Run with:  npx tsx scripts/test-resolve-zoning.mts [DISTRICT_CODE]
 *
 * Examples:
 *   npx tsx scripts/test-resolve-zoning.mts R7A
 *   npx tsx scripts/test-resolve-zoning.mts R6B
 *   npx tsx scripts/test-resolve-zoning.mts C4-4
 *   npx tsx scripts/test-resolve-zoning.mts "R7A/C1-3"   # base + overlay
 *   npx tsx scripts/test-resolve-zoning.mts MX-1          # unknown → fetched-unverified fallback
 */

// tsx resolves path aliases via tsconfig/jsconfig; use relative path here for portability
import { resolveZoning } from "../lib/zoning/resolveZoning.js";
import { RULES_TABLE_VERSION, SEEDED_DISTRICTS } from "../lib/zoning/nycZoningRules.js";

const code = process.argv[2] ?? "R7A";

console.log(`\n${"═".repeat(60)}`);
console.log(`  NYC Zoning Resolver — rules table v${RULES_TABLE_VERSION}`);
console.log(`  Seeded districts: ${SEEDED_DISTRICTS.join(", ")}`);
console.log(`${"═".repeat(60)}\n`);
console.log(`Resolving: "${code}"\n`);

const result = await resolveZoning(code);

// Pretty-print each field with its provenance
function fmtVal(sv: { value: unknown; provenance: string; provenanceDetail: string }): string {
  const v = sv.value === null ? "null" : String(sv.value);
  return `${v.padEnd(16)}  [${sv.provenance} — ${sv.provenanceDetail}]`;
}

console.log(`district          : ${result.district}`);
console.log(`districtName      : ${result.districtName ?? "unknown"}`);
console.log(`heightRegime      : ${fmtVal(result.heightRegime)}`);
console.log(`─── FAR ───────────────────────────────────────────────`);
console.log(`  residential     : ${fmtVal(result.far.residential)}`);
console.log(`  commercial      : ${fmtVal(result.far.commercial)}`);
console.log(`  communityFacility: ${fmtVal(result.far.communityFacility)}`);
console.log(`─── Heights (ft) ──────────────────────────────────────`);
console.log(`  maxBuildingHeight: ${fmtVal(result.maxHeight)}`);
console.log(`  maxBaseHeight   : ${fmtVal(result.maxBaseHeight)}`);
console.log(`─── Lot ───────────────────────────────────────────────`);
console.log(`  maxLotCoverage  : ${fmtVal(result.lotCoverage)}`);
console.log(`─── Uses ──────────────────────────────────────────────`);
console.log(`  allowedUseGroups: ${fmtVal(result.allowedUseGroups)}`);
if (result.overlays.length) {
  console.log(`  overlays        : ${result.overlays.join(", ")}`);
}
console.log(`─── Quality ───────────────────────────────────────────`);
console.log(`  needsManualConfirmation: ${result.needsManualConfirmation}`);
console.log(`\n─── provenanceNotes ───────────────────────────────────`);
result.provenanceNotes.forEach((n, i) => console.log(`  [${i + 1}] ${n}`));
console.log(`\n${"═".repeat(60)}\n`);
console.log("Full JSON:\n");
console.log(JSON.stringify(result, null, 2));
