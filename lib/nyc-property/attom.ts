/**
 * ATTOM property data fetcher
 * Docs: https://api.attomdata.com/docs
 * Auth: X-API-Key header using ATTOM_API_KEY env var.
 *
 * Endpoint used: /propertyapi/v1.0.0/property/expandedprofile
 * This endpoint returns owner, sale history, building characteristics,
 * and assessment data in one call.
 *
 * Test addresses:
 *   "305 East 105 Street, New York, NY 10029"  → owner: 305 MK SECURE HOLDINGS LLC
 *   "120 Broadway, New York, NY 10271"          → prominent commercial building
 *   "1 MetroTech Center, Brooklyn, NY 11201"    → mixed-use tower
 */

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// ── Raw ATTOM shapes (partial — only fields we consume) ──────────────────────

interface AttomSaleHistory {
  saleTransDate?: string;
  saleAmt?: number;
  saleRecDate?: string;
}

interface AttomBuilding {
  size?: {
    bldgsize?: number;         // total building area sq ft
    grosssize?: number;
    livingsize?: number;
    groundfloorsize?: number;
  };
  rooms?: {
    bathstotal?: number;
    bedroomscount?: number;
  };
  construction?: {
    condition?: string;
    constructiontype?: string; // e.g. "MASONRY"
    yearbuilt?: number;
    remodel?: { remodelYear?: number };
  };
  summary?: {
    archstyle?: string;        // building style
    storiesnumber?: number;
    unitscount?: number;
    bldgtype?: string;
  };
}

interface AttomOwner {
  owner1?: { lastname?: string; firstname?: string };
  corporateindicator?: string;
  absenteeOwnerStatus?: string;
}

interface AttomLot {
  lotsize1?: number;   // sq ft
  lotsize2?: number;   // acres
  frontage?: number;
  depth?: number;
}

interface AttomAssessment {
  assessed?: { assdttlvalue?: number; assdlandvalue?: number; assdimprvalue?: number };
  market?: { mktttlvalue?: number };
  tax?: { taxamt?: number; taxyear?: number };
}

interface AttomRaw {
  property?: Array<{
    identifier?: { attomId?: number; fips?: string };
    address?: {
      line1?: string; line2?: string; oneLine?: string;
      countrySubd?: string; locality?: string; postal1?: string;
    };
    summary?: {
      propclass?: string; propsubtype?: string; proptype?: string;
      legal1?: string; legal2?: string;
      yearbuilt?: number;
      absenteeInd?: string;
    };
    lot?: AttomLot;
    building?: AttomBuilding;
    owner?: AttomOwner;
    sale?: AttomSaleHistory & { amount?: { saleamt?: number }; calculation?: Record<string, unknown> };
    assessment?: AttomAssessment;
  }>;
}

// ── Normalized ATTOM output ──────────────────────────────────────────────────

export interface AttomPropertyData {
  ownerName: string | null;
  saleDate: string | null;
  saleAmount: number | null;
  yearBuilt: number | null;
  numStories: number | null;
  totalUnits: number | null;
  totalAreaSqFt: number | null;     // building gross area
  lotFrontage: number | null;
  lotDepth: number | null;
  lotAreaSqFt: number | null;
  constructionType: string | null;  // e.g. "MASONRY"
  buildingStyle: string | null;     // archstyle
  /** Raw API payload for audit / debugging */
  _raw: unknown;
}

function resolveOwnerName(owner: AttomOwner | undefined): string | null {
  if (!owner) return null;
  // Corporate owners have last name = company name, first name empty
  const last = owner.owner1?.lastname?.trim() ?? "";
  const first = owner.owner1?.firstname?.trim() ?? "";
  if (!last && !first) return null;
  if (!first) return last;
  return `${last}, ${first}`;
}

function toNum(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== "" && !isNaN(n) && n !== 0 ? n : null;
}

export function normalizeAttom(raw: AttomRaw): AttomPropertyData {
  const p = raw?.property?.[0];
  if (!p) {
    return {
      ownerName: null, saleDate: null, saleAmount: null, yearBuilt: null,
      numStories: null, totalUnits: null, totalAreaSqFt: null,
      lotFrontage: null, lotDepth: null, lotAreaSqFt: null,
      constructionType: null, buildingStyle: null, _raw: raw,
    };
  }

  const bldg = p.building;
  const lot = p.lot;

  return {
    ownerName: resolveOwnerName(p.owner),
    saleDate: p.sale?.saleTransDate ?? p.sale?.saleRecDate ?? null,
    saleAmount: toNum(p.sale?.amount?.saleamt ?? p.sale?.saleAmt),
    yearBuilt: toNum(bldg?.construction?.yearbuilt ?? p.summary?.yearbuilt),
    numStories: toNum(bldg?.summary?.storiesnumber),
    totalUnits: toNum(bldg?.summary?.unitscount),
    // prefer grosssize, fall back to bldgsize
    totalAreaSqFt: toNum(bldg?.size?.grosssize ?? bldg?.size?.bldgsize),
    lotFrontage: toNum(lot?.frontage),
    lotDepth: toNum(lot?.depth),
    lotAreaSqFt: toNum(lot?.lotsize1),
    constructionType: bldg?.construction?.constructiontype?.trim() || null,
    buildingStyle: bldg?.summary?.archstyle?.trim() || null,
    _raw: raw,
  };
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchAttomProperty(address: string): Promise<AttomPropertyData> {
  const apiKey = process.env.ATTOM_API_KEY?.trim();
  if (!apiKey) throw new Error("ATTOM_API_KEY is not set");

  // Split address into street + city/state for ATTOM query params
  // e.g. "305 East 105 Street, New York, NY 10029" → address1 + address2
  const commaIdx = address.indexOf(",");
  const address1 = commaIdx > 0 ? address.slice(0, commaIdx).trim() : address.trim();
  const address2 = commaIdx > 0 ? address.slice(commaIdx + 1).trim() : "";

  const params = new URLSearchParams({ address1 });
  if (address2) params.set("address2", address2);

  const url = `${ATTOM_BASE}/property/expandedprofile?${params}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "APIKey": apiKey,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ATTOM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json: AttomRaw = await res.json();
  return normalizeAttom(json);
}
