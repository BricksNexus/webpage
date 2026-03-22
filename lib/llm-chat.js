/**
 * Chat completions endpoint: OpenRouter (preferred) or direct OpenAI fallback.
 * @see https://openrouter.ai/docs/quickstart
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
  // ZONING_CONSULTANT_API_KEY = optional alias if you named the var that way in Vercel
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
      defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
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
