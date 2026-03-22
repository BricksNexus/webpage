/**
 * Simplified, educational zoning patterns for AI context only.
 * NOT the official code. Always verify with NYC Zoning Resolution / Boston Zoning Code and licensed professionals.
 */
export const ZONING_KNOWLEDGE_BASE = {
  version: "1.0",
  disclaimer:
    "This JSON is a deliberately simplified teaching aid for conversational AI. It is not legal advice, not an exhaustive code extract, and may be outdated. Official maps, text amendments, special districts, and BSA/Board decisions override any summary here.",

  comparisonFramework: {
    currentUseVsMaxUnits:
      "Compare the property's inferred or stated current use (and unit count if known) against the typical maximum dwelling units or use intensity allowed in the identified or assumed zoning district.",
    lotSizeVsMinLotPerUnit:
      "If lot area (sq ft) is known, compare it to typical minimum lot area per dwelling unit or minimum lot width/area rules for that district. If lot area is unknown, state what must be measured or pulled from the assessor.",
    locationVsADU:
      "Assess whether accessory dwelling units (ADUs) or similar are commonly feasible in that jurisdiction and zone typology: overlay districts, historic districts, parking, owner-occupancy requirements, and state enabling law may apply.",
  },

  cities: {
    nyc: {
      jurisdiction: "New York City, NY",
      authorityNote:
        "NYC Department of City Planning (ZoLa / Zoning Resolution). Actual rules depend on lot lines, lot area, lot width, use groups, FAR, height/setback, parking, MIH/Inclusionary Housing, FRESH, and special purpose districts.",

      zones: [
        {
          zonePattern: "R1-1",
          shortLabel: "R1-1 (example lower-density residential)",
          typicalMaxDwellingUnits:
            "Generally oriented to **single-family detached** residential patterns; additional principal dwelling units on the same zoning lot are typically **not** allowed in the same way as in denser R districts. Treat as **lowest practical path to add units** without a rezoning or city action.",
          lotAreaNotes:
            "Minimum lot area and lot width rules are strict in R1 subdistricts; small lots may be non-conforming. Compare reported lot area (e.g. from PLUTO) to **minimum lot area** and **minimum lot width** in the applicable R1 column of the Zoning Resolution.",
          aduAndAccessory:
            "Accessory structures and enlargements are regulated by **yard, height, and coverage** rules. State and local rules on accessory dwelling-like uses are complex in NYC—flag **DOB**, **HPD**, and **DCP** confirmation.",
        },
        {
          zonePattern: "R2",
          shortLabel: "R2",
          typicalMaxDwellingUnits:
            "Typically **one- and two-family** detached or semi-detached patterns depending on lot configuration; not general multifamily-by-right like many R3–R10 contexts.",
          lotAreaNotes:
            "Minimum lot area per building/unit relationships differ from R1 and from higher-R districts; compare lot size to **per-dwelling-unit** and **per-building** minimums in the ZR.",
          aduAndAccessory:
            "Same caution as R1-1: accessory living space may be limited by use definitions and building code; do not assume an 'ADU' label from other cities maps 1:1 to NYC processes.",
        },
        {
          zonePattern: "R3-1,R3-2,R3A,R4,R5",
          shortLabel: "R3–R5 (general family of medium-density residential)",
          typicalMaxDwellingUnits:
            "Often allows **multiple dwelling units** on a zoning lot subject to **FAR**, **lot coverage**, **height**, **setbacks**, and sometimes **density factor** rules. 'Maximum' is not a single number without calculating full zoning envelope.",
          lotAreaNotes:
            "Lot area drives **open space ratio**, **rear yard equivalent**, and sometimes **floor area**. Compare lot area to the **density**, **FAR**, and **yard** requirements for the specific R subdistrict.",
          aduAndAccessory:
            "Enlargements or new wings may be feasible if they comply with bulk and use regulations; confirm whether the change is **alteration** vs **new building** under DOB.",
        },
        {
          zonePattern: "R6,R7,R8,R9,R10",
          shortLabel: "R6–R10 (higher-density residential)",
          typicalMaxDwellingUnits:
            "Higher residential FAR and tower rules may allow **many units**; MIH/Inclusionary Housing and other programs may mandate affordable components on qualifying projects.",
          lotAreaNotes:
            "Lot size interacts with **tower rules**, **sky exposure planes**, and **courtyard** requirements. Minimum lot size alone is rarely the binding constraint—**FAR and tower-on-base** often dominate.",
          aduAndAccessory:
            "Large buildings: ADU framing is less common than **conversion**, **subdivision of zoning lots**, or **as-of-right** enlargements under bulk rules.",
        },
      ],

      defaultWhenZoneUnknown:
        "If zoning district is unknown or 'hint' only, do not assert R1/R2 behavior. Use OSM + Census only to scope **next verification steps** (ZoLa, BIS, PLUTO, survey).",

      aduEligibilityNYC:
        "NYC does not use a single statewide 'ADU bill' label like some states. Discuss **accessory** space, **cellar/basement** legality, **conversion**, and **two-family** permissions in the actual zone. Always recommend **DCP + DOB** confirmation.",
    },

    boston: {
      jurisdiction: "Boston, MA",
      authorityNote:
        "Boston Zoning Code and BPDA overlays; verifying zoning polygon vs lot is essential. Assessing data may not match zoning layer.",

      zones: [
        {
          zonePattern: "1-1,1-2,1-3,1-4",
          shortLabel: "Article 1 single-family (illustrative grouping)",
          typicalMaxDwellingUnits:
            "Many **single-family** districts are structured around **one dwelling unit** per lot or per building depending on subarticle; **two-family** or **multi-family** usually requires a different district or relief.",
          lotAreaNotes:
            "Minimum **lot area**, **lot width**, and **frontage** are common constraints. Compare assessor lot size to code minima for the mapped zoning article (exact numbers vary by subdistrict).",
          aduAndAccessory:
            "Boston has pursued **accessory dwelling unit** policies in phases; eligibility may depend on **owner occupancy**, **lot size**, **parking**, **historic** overlays, and **neighborhood** qualifying criteria. Treat city portal + ISD as authoritative.",
        },
        {
          zonePattern: "2,3",
          shortLabel: "Two- and three-family (illustrative)",
          typicalMaxDwellingUnits:
            "Often allows **2–3 dwelling units** in aligned districts, subject to dimensional standards.",
          lotAreaNotes:
            "Lot area per unit and spacing rules apply; compare reported lot to **per-unit** requirements in the mapped article.",
          aduAndAccessory:
            "Additional units may still require compliance with **parking**, **open space**, and **building height**; confirm whether an ADU program applies to the subdistrict.",
        },
      ],

      defaultWhenZoneUnknown:
        "Use BPDA/zoning GIS for polygon. If only assessor text is available, flag **high uncertainty** for unit caps.",

      aduEligibilityBoston:
        "Check current **BPDA / ISD** guidance for ADU eligibility maps, owner-occupancy, and lot thresholds. Historic districts and parking waivers materially change outcomes.",
    },
  },

  genericWhenNotNYCOrBoston: {
    guidance:
      "Use Census place/county to name the likely reviewing authority. Use OSM tags only for physical hints. Recommend **municipal zoning GIS**, **county parcel CAMA**, and **state enabling law** for ADUs. Do not invent zone-specific numbers.",
  },
};

export function getZoningKnowledgeBaseJson() {
  return JSON.stringify(ZONING_KNOWLEDGE_BASE, null, 2);
}
