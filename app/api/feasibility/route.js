import { NextResponse } from "next/server";
import { buildZoningConsultantSystemPrompt } from "@/lib/homeowner-feasibility/zoning-consultant-prompt";
import { CORS_HEADERS } from "@/lib/api-cors";
import { getLlmChatConfig } from "@/lib/llm-chat";

function summarizeUpstreamLlmError(status, bodyText) {
  const raw = String(bodyText || "").trim();
  try {
    const j = JSON.parse(raw);
    const inner = j?.error;
    const msg =
      (typeof inner === "string" && inner) ||
      (inner && typeof inner.message === "string" && inner.message) ||
      (typeof j.message === "string" && j.message);
    if (msg) return `HTTP ${status}: ${msg}`;
  } catch {
    /* not JSON */
  }
  if (!raw) return `HTTP ${status}`;
  const short = raw.length > 1200 ? `${raw.slice(0, 1200)}…` : raw;
  return `HTTP ${status}: ${short}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/feasibility
 * Body: {
 *   address: string,
 *   property: object (from /api/property),
 *   messages: { role: 'user'|'assistant', content: string }[],
 *   exploreFocus?: string  // optional homeowner topic (first turn or static UI chips)
 * }
 *
 * Uses OpenRouter when OPENROUTER_API_KEY is set (recommended for Vercel),
 * else OpenAI when OPENAI_API_KEY is set; otherwise returns a placeholder summary.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();
    const property = body?.property || {};
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const exploreFocus = String(body?.exploreFocus || "").trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address`." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const llm = getLlmChatConfig();

    if (!llm) {
      return NextResponse.json(
        {
          ok: true,
          model: "none",
          feasibilitySummary:
            "## Current Status\n" +
            "No LLM is configured. Set `OPENROUTER_API_KEY` (or alias `ZONING_CONSULTANT_API_KEY`) or `OPENAI_API_KEY` in `.env.local` / Vercel.\n\n" +
            "## Potential for Growth\n" +
            "Vercel hides env values after save (not copyable). Use **Reveal** or paste a new key from OpenRouter. Optional: `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL` / `NEXT_PUBLIC_SITE_URL`.\n\n" +
            "## Regulatory Hurdles\n" +
            "Property JSON below is shown raw for development.\n\n" +
            "```json\n" +
            JSON.stringify(property, null, 2) +
            "\n```",
          disclaimer:
            "Placeholder output—not a zoning determination. Configure OpenRouter or OpenAI for full consultant formatting.",
        },
        { headers: CORS_HEADERS }
      );
    }

    const focusBlock =
      exploreFocus && messages.length === 0
        ? [
            "",
            "Homeowner topic to emphasize (from their selection on the page):",
            exploreFocus,
            "Prioritize this path in **Potential for Growth** with plain-language steps and tradeoffs; briefly mention how it differs from other common options. Still complete all three sections.",
          ].join("\n")
        : "";

    const userContext = [
      `Property address: ${address}`,
      `Structured property data (JSON):\n${JSON.stringify(property, null, 2)}`,
      "",
      "Perform the three comparisons from your instructions: (1) current use vs. typical maximum allowed dwelling units for the zone family, (2) lot size vs. minimum lot area / per-unit lot rules when data exists, (3) location and zone vs. ADU/accessory-dwelling-style feasibility per the Knowledge Base.",
      "Respond using the required sections: ## Current Status, ## Potential for Growth, ## Regulatory Hurdles.",
      focusBlock,
    ].join("\n");

    const chatMessages = [
      { role: "system", content: buildZoningConsultantSystemPrompt() },
      {
        role: "user",
        content: userContext,
      },
      ...messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: String(m.content || ""),
        })),
    ];

    const res = await fetch(llm.url, {
      method: "POST",
      headers: llm.headers,
      body: JSON.stringify({
        model: llm.defaultModel,
        messages: chatMessages,
        temperature: 0.35,
        max_tokens: 2400,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const summary = summarizeUpstreamLlmError(res.status, errText);
      return NextResponse.json(
        {
          error: `${llm.providerLabel} request failed`,
          detail: summary,
          raw: errText.length < 4000 ? errText : undefined,
        },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const data = await res.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No content returned from model.";

    return NextResponse.json(
      {
        ok: true,
        model: data?.model || llm.defaultModel,
        feasibilitySummary: text,
        disclaimer:
          "Informational only—not legal advice. Verify with your jurisdiction.",
      },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Feasibility analysis failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
