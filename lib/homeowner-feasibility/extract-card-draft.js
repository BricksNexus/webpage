/**
 * Parse structured opportunity card fields from an LLM feasibility response.
 * The model is instructed to append a ```card_draft JSON block at the end.
 */

const CARD_DRAFT_FENCE = /```(?:card_draft|json)\s*\n([\s\S]*?)```/gi;

/**
 * @param {string} rawText
 * @returns {{ displayText: string, cardDraft: object|null }}
 */
export function extractCardDraftFromFeasibility(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return { displayText: "", cardDraft: null };

  let cardDraft = null;
  let displayText = text;

  const matches = [...text.matchAll(CARD_DRAFT_FENCE)];
  for (const match of matches) {
    const block = String(match[1] || "").trim();
    try {
      const parsed = JSON.parse(block);
      if (parsed && typeof parsed === "object" && looksLikeCardDraft(parsed)) {
        cardDraft = normalizeCardDraft(parsed);
        displayText = displayText.replace(match[0], "").trim();
        break;
      }
    } catch {
      /* try next fence */
    }
  }

  displayText = displayText.replace(/\n{3,}/g, "\n\n").trim();
  return { displayText, cardDraft };
}

function looksLikeCardDraft(obj) {
  return (
    "opportunityTitle" in obj ||
    "workersNeeded" in obj ||
    "estimatedCost" in obj ||
    "jobDescription" in obj
  );
}

function normalizeCardDraft(raw) {
  const workers = Array.isArray(raw.workersNeeded)
    ? raw.workersNeeded.map((w) => String(w || "").trim()).filter(Boolean)
    : [];

  const scopes = Array.isArray(raw.projectScopes)
    ? raw.projectScopes.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

  return {
    opportunityTitle: String(raw.opportunityTitle || "").trim(),
    jobDescription: String(raw.jobDescription || "").trim(),
    workersNeeded: workers,
    estimatedCost: String(raw.estimatedCost || "").trim(),
    estimatedTimeline: String(raw.estimatedTimeline || "").trim(),
    projectScopes: scopes,
  };
}

/** Heuristic card draft when no LLM is configured. */
export function buildFallbackCardDraft(address, property, exploreFocus) {
  const city = property?.city || "your area";
  const focus = String(exploreFocus || "").trim();
  const title = focus
    ? `Explore ${focus.split(/[—–-]/)[0].trim().slice(0, 40)} — ${city}`
    : `Explore adding units — ${city}`;

  return {
    opportunityTitle: title,
    jobDescription:
      "Preliminary review based on your address. Confirm zoning, permits, and scope with local planning staff and licensed professionals before committing.",
    workersNeeded: [
      "Architect",
      "General Contractor",
      "Real Estate Lawyer",
      "Project Manager",
    ],
    estimatedCost: "$75,000 – $350,000+ (varies widely by scope and region)",
    estimatedTimeline: "6–18 months (design, permits, and construction)",
    projectScopes: focus ? [focus.split(".")[0].slice(0, 80)] : ["ADU / accessory unit exploration"],
  };
}
