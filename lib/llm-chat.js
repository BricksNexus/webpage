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

/**
 * @returns {{ url: string, headers: Record<string,string>, defaultModel: string, providerLabel: string } | null}
 */
export function getLlmChatConfig() {
  // ZONING_CONSULTANT_API_KEY = optional alias if you named the var that way in Vercel
  const openrouterKey =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.ZONING_CONSULTANT_API_KEY?.trim();
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

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
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
