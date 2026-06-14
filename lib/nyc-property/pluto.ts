/**
 * NYC MapPLUTO fetcher via Socrata Open Data API
 * Dataset: MapPLUTO (latest) on data.cityofnewyork.us
 * Docs: https://dev.socrata.com/foundry/data.cityofnewyork.us/64uk-42ks
 *
 * Query by BBL (borough * 1_000_000_000 + block * 10_000 + lot numeric).
 * No token required at low volume; set NYC_APP_TOKEN for higher rate limits.
 *
 * PLUTO is authoritative for:
 *   zoning district, lot area/dimensions, units, building class,
 *   year built, stories, residential/commercial area breakdown.
 *
 * Building class codes: https://www.nyc.gov/assets/finance/jump/hlpbldgcode.html
 *
 * Test BBLs:
 *   1016770005  → 305 East 105 St, Manhattan, block 1677, lot 5
 *   1000010001  → 120 Broadway (approximate)
 *   3018780001  → 1 MetroTech Center, Brooklyn
 */

// MapPLUTO dataset identifier (stable across refreshes)
const PLUTO_DATASET = "64uk-42ks";
const SOCRATA_BASE = "https://data.cityofnewyork.us/resource";

// ── Building class → human label (most common codes) ────────────────────────
// Full list: https://www.nyc.gov/assets/finance/jump/hlpbldgcode.html
const BUILDING_CLASS_LABELS: Record<string, string> = {
  A0: "Cape Cod", A1: "Two Stories - Detached", A2: "One Story - Permanent Living Quarters",
  A3: "Large Suburban Residence", A4: "City Residence - One Family", A5: "Semi-Detached",
  A6: "Summer Cottages", A7: "Mansion Type/City Home", A8: "Bungalow Colony/Land Coop",
  A9: "Miscellaneous - One Family",
  B1: "Two Family Brick", B2: "Two Family Frame", B3: "Two Family Converted From One Family",
  B9: "Miscellaneous - Two Family",
  C0: "Three Family", C1: "Over Six Families Without Stores", C2: "Converted Dwellings (Three or More)",
  C3: "Brick, Four Families", C4: "Old Law Tenements (Pre-1901)", C5: "Converted Dwellings",
  C6: "Cooperative", C7: "Walk-Up Apartment Coop", C8: "Walk-Up Cooperative",
  C9: "Miscellaneous - Walk-Up", CA: "Altered Walk-Up (One to Two Families)",
  D0: "Elevator Co-op", D1: "Semi-Fireproof Without Stores", D2: "Artists in Residence",
  D3: "Fireproof Without Stores", D4: "Elevator Cooperative", D5: "Converted Elevator Apartments",
  D6: "Fireproof Elevator (Old-Law)", D7: "Fireproof Elevator (New-Law)",
  D8: "Luxury Type", D9: "Miscellaneous - Elevator",
  E1: "Warehouse, Garage, Gas Station", E2: "Garage",
  E3: "Warehouse", E4: "Garage (Three Stories)", E6: "Self-Storage",
  E7: "Warehouse w/ Residential", E9: "Miscellaneous - Warehouse/Garage",
  F1: "Factory - One Story", F2: "Factory - Two Stories", F4: "Factory - Multiple Stories",
  F5: "Factory with Office Space", F8: "Industrial Building", F9: "Miscellaneous - Industrial",
  G0: "Garage - Tax Class 4", G1: "All Parking Garages", G2: "Auto Body / Repair Shop",
  G3: "Gas Station with Service",  G4: "Gas Station", G5: "Car Wash",
  G6: "Unlicensed - Auto Repair", G7: "Fully Enclosed Parking", G8: "Outdoor Parking",
  G9: "Miscellaneous - Garage",
  H1: "Hotels - Class A", H2: "Hotels - Transient", H3: "Hotels - YMCA",
  H4: "Hotels - City Owned", H5: "Hotels - Private Club", H6: "Motels",
  H7: "Apartment Hotels", H8: "Dormitories", H9: "Miscellaneous - Hotel",
  HB: "Boutique Hotel", HH: "HHH Hotel", HR: "SRO Hotel", HS: "Extended Stay Hotel",
  K1: "One Story Retail Building", K2: "Multi-Story Retail Building",
  K3: "Multi-Story Department Store", K4: "Predominant Retail with Other Uses",
  K6: "Shopping Centers with Parking", K9: "Miscellaneous - Store Building",
  L1: "Loft - Over Eight Families", L2: "Loft - Fireproof w/ Stores",
  L3: "Loft - Semi-Fireproof", L8: "Loft - Misc", L9: "Miscellaneous - Loft Building",
  M1: "Church, Synagogue, Chapel", M2: "Mission or Convent", M3: "Church with School",
  M4: "Church with Residence", M9: "Miscellaneous - Religious",
  N1: "Asylum", N2: "Home for Indigents", N3: "Orphanage",
  N4: "Detention House for Wayward Boys", N9: "Miscellaneous - Asylum",
  O1: "Office - One Story", O2: "Office - Two Stories", O3: "Office - Three to Six Stories",
  O4: "Office - Seven or More Stories", O5: "Office with Stores",
  O6: "Office with Apartments", O7: "Professional Buildings", O8: "Office - Over Store",
  O9: "Miscellaneous - Office Building",
  P1: "Indoor Public Assembly", P2: "Churches", P3: "Privates Clubs",
  P4: "Beach Club", P5: "Amusements", P6: "Funeral Parlor",
  P7: "Indoor Swimming Pool", P8: "Marina / Yacht Club", P9: "Miscellaneous - Indoor Public Assembly",
  Q1: "Parks / Playgrounds", Q2: "Zoos", Q3: "Outdoor Swimming Pools",
  Q4: "Beaches", Q5: "Golf Courses", Q6: "Stadium, Race Track, Baseball Field",
  Q7: "Tennis Court", Q8: "Marinas / Yacht Clubs (Outdoor)", Q9: "Miscellaneous - Outdoor Recreation",
  R1: "Condominiums - Residential Unit in 2–10 Unit Building", R2: "Walk-Up Condo",
  R3: "Indoor Parking Unit in Condo", R4: "Residential Condo in Elevator Bldg",
  R5: "Miscellaneous Commercial Condo", R6: "Commercial Condo Unit",
  R7: "Condominium Cooperative Unit", R8: "Commercial Condo in Loft Building",
  R9: "Co-op within a Condominium", RA: "Condo Apartment - Lease", RB: "Condo Office Unit",
  RC: "Retail Condo", RD: "Residential Condo in Mixed-Use Building",
  RG: "Indoor Parking Condo", RH: "Hotel Condo Unit", RK: "Retail Space Condo",
  RM: "Condo - Mixed-use Building (Residential)", RP: "Condo - Parking in Residential",
  RR: "Condominium (Entire Block)", RS: "Non-Business Storage Condo",
  RT: "Terraced Condo", RW: "Warehouse Condo", RX: "Mixed Residential/Commercial",
  RZ: "Mixed Residential/Commercial Condo",
  S0: "Primarily One Family with Two Stores", S1: "Primarily One Family with One Store",
  S2: "Primarily Two Family with One Store", S3: "Primarily Three Family with Stores",
  S4: "Primarily Four Family with Stores", S5: "Primarily Five to Six Family with Stores",
  S9: "Single/Multiple Family with Stores (Not Classified)",
  T1: "Airport, Air Field, Terminal", T2: "Pier, Dock, Bulkhead",
  T3: "Ferry Terminal and Landing", T9: "Miscellaneous - Transportation Facilities",
  U0: "Utility Company Land and Building", U1: "Bridge, Tunnel, Highway",
  U2: "Gas, Electric, Telephone Distribution System",
  U3: "Ceiling Railway", U4: "Telephone Relay Tower", U5: "Communications Facility",
  U6: "Electric Generating Facility", U7: "Nuclear Generating Plant",
  U8: "Reservoir / Water Tower", U9: "Miscellaneous - Utility Property",
  V0: "Zoned Residential, Not Manhattan", V1: "Zoned Commercial or Manhattan",
  V2: "Zoned Commercial Adjacent to Class V1", V3: "Zoned Primarily Residential",
  V4: "Police or Fire Department", V5: "School or Yard", V6: "Library",
  V7: "City Owned Land", V8: "State/Federal Owned", V9: "Miscellaneous - Vacant Land",
  W1: "Public Elementary / Junior High School", W2: "Parochial School",
  W3: "Private School", W4: "Training School",
  W5: "City University", W6: "Other College / University",
  W7: "Theological Seminary", W8: "Other Private School",
  W9: "Miscellaneous - Educational",
  Y1: "Fire Department", Y2: "Police Department", Y3: "Prison / Jail",
  Y4: "Military / Naval Installation", Y5: "Department of Real Property",
  Y6: "Department of Sanitation", Y7: "Department of Ports & Trade",
  Y8: "Dept of Public Works", Y9: "Miscellaneous - Government",
  Z0: "Tennis Court", Z1: "Court House",
  Z2: "Public Parking Area", Z3: "Post Office",
  Z4: "Foreign Government",  Z5: "United Nations", Z7: "Easement",
  Z8: "Cemetery", Z9: "Other Miscellaneous",
};

export function buildingClassLabel(code: string | null): string | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return BUILDING_CLASS_LABELS[upper] ?? `Class ${upper}`;
}

// ── Raw PLUTO row (subset of fields we use) ──────────────────────────────────

interface PlutoRow {
  bbl?: string;
  borough?: string;
  block?: string;
  lot?: string;
  address?: string;
  zonedist1?: string;   // primary zoning district e.g. "R7A"
  zonedist2?: string;
  bldgclass?: string;   // building class code e.g. "D4"
  taxclass?: string;    // tax class e.g. "2"
  ownername?: string;
  numbldgs?: string;    // number of buildings
  numfloors?: string;   // stories
  unitsres?: string;    // residential units
  unitstotal?: string;  // total units
  lotarea?: string;     // lot area sq ft
  bldgarea?: string;    // total building area sq ft
  resarea?: string;     // residential floor area
  comarea?: string;     // commercial floor area
  lotfront?: string;    // lot frontage (ft)
  lotdepth?: string;    // lot depth (ft)
  bldgfront?: string;   // building frontage (ft)
  bldgdepth?: string;   // building depth (ft)
  yearbuilt?: string;
  yearalter1?: string;  // most recent alteration year
  condono?: string;     // condo number (non-zero = condo lot)
  landmark?: string;
  histdist?: string;
  splitzone?: string;
}

// ── Normalized PLUTO output ──────────────────────────────────────────────────

export interface PlutoPropertyData {
  ownerName: string | null;
  zoningDistrict: string | null;        // primary zone e.g. "R7A"
  buildingClassCode: string | null;     // e.g. "D4"
  buildingClassLabel: string | null;
  taxClass: string | null;
  numBuildings: number | null;
  yearBuilt: number | null;
  numStories: number | null;
  totalUnits: number | null;
  residentialUnits: number | null;
  commercialUnits: number | null;       // derived: totalUnits - residentialUnits
  totalAreaSqFt: number | null;         // bldgarea
  residentialAreaSqFt: number | null;
  commercialAreaSqFt: number | null;
  lotFrontage: number | null;
  lotDepth: number | null;
  lotAreaSqFt: number | null;
  buildingFrontage: number | null;
  buildingDepth: number | null;
  landmark: string | null;
  historicDistrict: string | null;
  /** Raw row for audit */
  _raw: unknown;
}

function toNum(v: string | undefined | null): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) || n === 0 ? null : n;
}

function toInt(v: string | undefined | null): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) || n === 0 ? null : n;
}

export function normalizePluto(row: PlutoRow): PlutoPropertyData {
  const resUnits = toInt(row.unitsres);
  const totalUnits = toInt(row.unitstotal);
  const commercialUnits =
    totalUnits != null && resUnits != null ? totalUnits - resUnits : null;

  const bldgClass = row.bldgclass?.trim().toUpperCase() || null;

  return {
    ownerName: row.ownername?.trim() || null,
    zoningDistrict: row.zonedist1?.trim() || null,
    buildingClassCode: bldgClass,
    buildingClassLabel: buildingClassLabel(bldgClass),
    taxClass: row.taxclass?.trim() || null,
    numBuildings: toInt(row.numbldgs),
    yearBuilt: toInt(row.yearbuilt),
    numStories: toNum(row.numfloors),
    totalUnits,
    residentialUnits: resUnits,
    commercialUnits,
    totalAreaSqFt: toNum(row.bldgarea),
    residentialAreaSqFt: toNum(row.resarea),
    commercialAreaSqFt: toNum(row.comarea),
    lotFrontage: toNum(row.lotfront),
    lotDepth: toNum(row.lotdepth),
    lotAreaSqFt: toNum(row.lotarea),
    buildingFrontage: toNum(row.bldgfront),
    buildingDepth: toNum(row.bldgdepth),
    landmark: row.landmark?.trim() || null,
    historicDistrict: row.histdist?.trim() || null,
    _raw: row,
  };
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchPlutoByBbl(bbl: string): Promise<PlutoPropertyData> {
  // PLUTO stores BBL as a numeric string without leading zeros in the dataset
  // Query uses the string bbl field directly
  const params = new URLSearchParams({
    bbl,
    "$limit": "1",
  });

  const url = `${SOCRATA_BASE}/${PLUTO_DATASET}.json?${params}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const appToken = process.env.NYC_APP_TOKEN?.trim();
  if (appToken) headers["X-App-Token"] = appToken;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PLUTO Socrata HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const rows: PlutoRow[] = await res.json();
  if (!rows.length) {
    throw new Error(`PLUTO returned no row for BBL ${bbl}`);
  }

  return normalizePluto(rows[0]);
}
