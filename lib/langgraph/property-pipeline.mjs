/**
 * lib/langgraph/property-pipeline.mjs
 * LangGraph 4-node linear pipeline:
 *   enrich_property → fetch_zoning_rules → analyze_opportunity → format_report
 *
 * Usage:
 *   import { propertyPipeline } from "./property-pipeline.mjs";
 *   const result = await propertyPipeline.invoke({ address: "305 East 105 St, New York, NY" });
 *   // result.report = flat report object for the UI
 *
 * Context: API.md (POST /api/opportunity/analyze) | CODEBASE.md (lib/langgraph section)
 */

import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchPropertyIntel } from "../open-property/fetch-property-intel.mjs";
import { getZoningKnowledgeBaseJson } from "../homeowner-feasibility/zoning-knowledge-base.js";

// ---------------------------------------------------------------------------
// State definition — plain JS Annotation (NO TypeScript generics)
// Each field uses reducer: (x, y) => y ?? x so later writes win over earlier
// ---------------------------------------------------------------------------
const PipelineState = Annotation.Root({
  address:      Annotation,
  property:     Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  zoningRules:  Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  aiAssessment: Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
  report:       Annotation({ default: () => null, reducer: (x, y) => y ?? x }),
});

// ---------------------------------------------------------------------------
// Node 1: enrich_property
// Direct import — no self-HTTP call (avoids circular dependency + port brittleness)
// ---------------------------------------------------------------------------
async function enrichProperty(state) {
  try {
    const result = await fetchPropertyIntel(state.address);
    return { property: result };
  } catch (e) {
    return { property: { ok: false, error: e?.message || "enrich_property failed" } };
  }
}

// ---------------------------------------------------------------------------
// Node 2: fetch_zoning_rules
// Three-tier: NYC PLUTO (live FAR data) → Boston → Gemini knowledge (generic)
// ---------------------------------------------------------------------------
async function fetchZoningRules(state) {
  const { property } = state;
  if (!property || property.ok === false) {
    return { zoningRules: { source: "error", error: "No property data to derive zoning from" } };
  }

  const isNYC    = property.localRecords?.nyc?.pluto?.ok === true;
  const isBoston = property.localRecords?.boston?.assessing?.ok === true;

  if (isNYC) {
    const pluto = property.localRecords.nyc.pluto;
    return {
      zoningRules: {
        source:            "nyc_pluto",
        zoningDistrict:    pluto.zoningDistrict,
        residFar:          pluto.residFar,
        commFar:           pluto.commFar,
        lotAreaSqFt:       pluto.lotAreaSqFt,
        totalBuildingArea: pluto.totalBuildingArea,
        numFloors:         pluto.numFloors,
        rawPluto:          pluto,
      },
    };
  }

  if (isBoston) {
    return {
      zoningRules: {
        source:         "boston_assessing",
        zoningDistrict: property.zoningDistrict,
        note:           "Boston zoning: AI will supplement with general principles",
      },
    };
  }

  return {
    zoningRules: {
      source:         "gemini_knowledge",
      zoningDistrict: property.zoningDistrict,
      note:           "Non-NYC/Boston city: AI will apply general US zoning principles",
    },
  };
}

// ---------------------------------------------------------------------------
// Node 3: analyze_opportunity
// Gemini structured output — returns exact OpportunityAssessment JSON
// ---------------------------------------------------------------------------

// Schema must use only string/number/boolean/array — NO null union types
const opportunitySchema = {
  title: "OpportunityAssessment",
  type: "object",
  properties: {
    canBuildMore:            { type: "boolean", description: "Can the owner build additional units based on FAR or zoning?" },
    additionalUnitsEstimate: { type: "number",  description: "Estimated number of additional units possible; 0 if none" },
    canAddFloors:            { type: "boolean", description: "Can additional floors be added within height limits?" },
    conversionOpportunity:   { type: "string",  description: "Describe any residential-to-commercial or commercial-to-residential conversion opportunity, or 'None identified'" },
    farUsed:                 { type: "number",  description: "Current FAR: totalBuildingArea / lotAreaSqFt. Use 0 if unknown." },
    farAllowed:              { type: "number",  description: "Maximum FAR allowed by zoning district. Use residFar from PLUTO if available, else estimate from zoning knowledge." },
    farRemaining:            { type: "number",  description: "Remaining FAR: farAllowed - farUsed. Use 0 if unknown." },
    heightLimitStories:      { type: "number",  description: "Maximum number of stories allowed by zoning. Use 0 if unknown." },
    currentStories:          { type: "number",  description: "Current number of stories on the property. Use 0 if unknown." },
    opportunities:           { type: "array", items: { type: "string" }, description: "List of specific, actionable development opportunity bullets. Empty array if none." },
    summary:                 { type: "string",  description: "2-3 paragraph narrative combining all findings. Reference specific FAR numbers, zoning district, and property data." },
  },
  required: [
    "canBuildMore", "additionalUnitsEstimate", "canAddFloors",
    "conversionOpportunity", "farUsed", "farAllowed", "farRemaining",
    "opportunities", "summary",
  ],
};

function buildAnalysisPrompt(property, zoningRules) {
  // getZoningKnowledgeBaseJson returns a JSON string — use directly
  const zoningKBString = getZoningKnowledgeBaseJson();
  const pluto = property.localRecords?.nyc?.pluto || {};
  const attom = property.attomData || {};

  const propertyContext = `
PROPERTY DATA:
- Address: ${property.streetLine || property.geocode?.normalized || "Unknown"}
- Owner: ${property.ownerName || "Unknown"}
- Block: ${pluto.block || "Unknown"}, Lot: ${pluto.lot || "Unknown"}
- Zoning District: ${zoningRules.zoningDistrict || property.zoningDistrict || "Unknown"}
- Building Class: ${pluto.buildingClass || "Unknown"}
- Year Built: ${attom.yearBuilt || pluto.yearBuiltPluto || "Unknown"}
- Number of Stories: ${attom.stories || pluto.numFloors || "Unknown"}
- Total Building Area: ${pluto.totalBuildingArea || attom.buildingSqFt || "Unknown"} sq ft
- Lot Area: ${pluto.lotAreaSqFt || property.lotAreaSqFt || "Unknown"} sq ft
- Residential Area: ${pluto.residentialArea || "Unknown"} sq ft
- Commercial Area: ${pluto.commercialArea || "Unknown"} sq ft
- Residential Units: ${pluto.residentialUnits || "Unknown"}
- Total Units: ${pluto.totalUnits || "Unknown"}
- Tax Class: ${pluto.taxClass || "Unknown"}
- Building Style: ${pluto.buildingStyle || "Unknown"}
- Use & Occupancy: ${property.useAndOccupancy || "Unknown"}

ZONING RULES (source: ${zoningRules.source}):
- Zoning District: ${zoningRules.zoningDistrict || "Unknown"}
- Residential FAR Allowed (PLUTO residfar): ${zoningRules.residFar ?? "Unknown"}
- Commercial FAR Allowed (PLUTO commfar): ${zoningRules.commFar ?? "Unknown"}
${zoningRules.note ? `- Note: ${zoningRules.note}` : ""}

ZONING KNOWLEDGE BASE (use for context):
${zoningKBString.slice(0, 3000)}
`.trim();

  return `You are a real estate development analyst specializing in NYC zoning and development opportunity analysis.

${propertyContext}

Analyze this property and return a structured assessment. Calculate:
1. FAR used = totalBuildingArea / lotAreaSqFt (if both available)
2. FAR remaining = farAllowed - farUsed
3. Whether additional units/floors are feasible given remaining FAR and height limits
4. Any conversion opportunities (residential <-> commercial)

Be specific: reference actual numbers from the property data. If data is missing, use zoning knowledge to estimate conservatively.`;
}

async function analyzeOpportunity(state) {
  const { property, zoningRules } = state;

  try {
    const model = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    });

    const structuredModel = model.withStructuredOutput(opportunitySchema, {
      name: "OpportunityAssessment",
    });

    const prompt = buildAnalysisPrompt(property, zoningRules);
    const assessment = await structuredModel.invoke(prompt);
    return { aiAssessment: assessment };
  } catch (e) {
    // Return a minimal valid assessment so format_report can still produce output
    return {
      aiAssessment: {
        canBuildMore: false,
        additionalUnitsEstimate: 0,
        canAddFloors: false,
        conversionOpportunity: "Analysis unavailable",
        farUsed: 0,
        farAllowed: 0,
        farRemaining: 0,
        heightLimitStories: 0,
        currentStories: 0,
        opportunities: [],
        summary: `AI analysis encountered an error. Property data was retrieved successfully.`,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Node 4: format_report
// Merges all state fields into a single flat report object for the UI
// ---------------------------------------------------------------------------
async function formatReport(state) {
  const { property, zoningRules, aiAssessment } = state;
  const pluto  = property?.localRecords?.nyc?.pluto  || {};
  const attom  = property?.attomData || {};
  const boston = property?.localRecords?.boston?.assessing || {};

  const report = {
    // --- Property Information ---
    address:          property?.streetLine || property?.geocode?.normalized || null,
    borough:          property?.city || property?.geocode?.context?.city || null,
    block:            pluto.block || null,
    lot:              pluto.lot   || null,
    ownerName:        property?.ownerName || null,
    buildingClass:    pluto.buildingClass || null,
    taxClass:         pluto.taxClass      || null,
    numBuildings:     pluto.numBuildings  || null,
    yearBuilt:        attom.yearBuilt     || pluto.yearBuiltPluto || null,
    numFloors:        attom.stories       || pluto.numFloors      || null,
    totalArea:        pluto.totalBuildingArea || attom.buildingSqFt || null,
    totalUnits:       pluto.totalUnits    || null,
    residentialArea:  pluto.residentialArea   || null,
    residentialUnits: pluto.residentialUnits  || null,
    commercialArea:   pluto.commercialArea    || null,
    commercialUnits:  (pluto.totalUnits != null && pluto.residentialUnits != null)
                        ? pluto.totalUnits - pluto.residentialUnits
                        : null,
    buildingStyle:    pluto.buildingStyle    || null,
    buildingFrontage: pluto.buildingFrontage || null,
    buildingDepth:    pluto.buildingDepth    || null,
    constructionType: pluto.constructionType || null,

    // --- Land Information ---
    landFrontage:     pluto.lotFrontage  || null,
    landDepth:        pluto.lotDepth     || null,
    lotAreaSqFt:      pluto.lotAreaSqFt  || property?.lotAreaSqFt || null,
    zoningDistrict:   zoningRules?.zoningDistrict || property?.zoningDistrict || null,

    // --- AI Opportunity Assessment ---
    aiAssessment: aiAssessment || null,

    // --- Meta ---
    dataSource:    zoningRules?.source || "unknown",
    fetchedAt:     property?.fetchedAt || new Date().toISOString(),
    limitations:   property?.limitations || [],
    dataQuality:   property?.dataQuality || null,
  };

  return { report };
}

// ---------------------------------------------------------------------------
// Build and compile the graph
// ---------------------------------------------------------------------------
const workflow = new StateGraph(PipelineState)
  .addNode("enrich_property",     enrichProperty)
  .addNode("fetch_zoning_rules",  fetchZoningRules)
  .addNode("analyze_opportunity", analyzeOpportunity)
  .addNode("format_report",       formatReport)
  .addEdge(START, "enrich_property")
  .addEdge("enrich_property",     "fetch_zoning_rules")
  .addEdge("fetch_zoning_rules",  "analyze_opportunity")
  .addEdge("analyze_opportunity", "format_report")
  .addEdge("format_report",       END);

export const propertyPipeline = workflow.compile();
