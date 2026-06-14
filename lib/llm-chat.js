/**
 * Chat completions: Google Gemini (preferred), OpenRouter, or direct OpenAI.
 * Gemini uses Google's OpenAI-compatible REST API:
 * @see https://ai.google.dev/gemini-api/docs/openai
 */

function siteUrlForOpenRouter() {
  const explicit =
    process.env.OPENROUTER_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (explicit) {
    const u = String(explicit).replace(/\/$/, "");
    return u.startsWith("http") ? u : `https://${u}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/** Normalize API keys pasted from dashboards (trim, CRLF, accidental "Bearer " prefix). */
function normalizeSecret(value) {
  if (value == null || typeof value !== "string") return "";
  let s = value.replace(/\r/g, "").trim();
  if (/^bearer\s+/i.test(s)) s = s.replace(/^bearer\s+/i, "").trim();
  return s;
}

/**
 * @returns {{ url: string, headers: Record<string,string>, defaultModel: string, providerLabel: string } | null}
 */
export function getLlmChatConfig() {
  // Google Gemini (AI Studio key) — preferred for /api/feasibility
  const geminiKey =
    normalizeSecret(process.env.GEMINI_API_KEY) ||
    normalizeSecret(process.env.GOOGLE_API_KEY) ||
    normalizeSecret(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (geminiKey) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      },
      defaultModel: process.env.GEMINI_MODEL || process.env.GOOGLE_MODEL || "gemini-2.0-flash",
      providerLabel: "Google Gemini",
    };
  }

  const openrouterKey =
    normalizeSecret(process.env.OPENROUTER_API_KEY) ||
    normalizeSecret(process.env.ZONING_CONSULTANT_API_KEY);
  if (openrouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
        "HTTP-Referer": siteUrlForOpenRouter(),
        "X-Title": process.env.OPENROUTER_APP_TITLE || "BricksNexus",
      },
      defaultModel: process.env.OPENROUTER_MODEL || "openrouter/free",
      providerLabel: "OpenRouter",
    };
  }

  const openaiKey = normalizeSecret(process.env.OPENAI_API_KEY);
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      defaultModel: process.env.OPENAI_MODEL || "gpt-4o",
      providerLabel: "OpenAI",
    };
  }

  return null;
}
