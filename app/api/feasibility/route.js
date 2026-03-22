import { NextResponse } from "next/server";
import { buildZoningConsultantSystemPrompt } from "@/lib/homeowner-feasibility/zoning-consultant-prompt";

/**
 * POST /api/feasibility
 * Body: {
 *   address: string,
 *   property: object (from /api/property),
 *   messages: { role: 'user'|'assistant', content: string }[]
 * }
 *
 * Uses OpenAI GPT-4o when OPENAI_API_KEY is set; otherwise returns a placeholder summary.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();
    const property = body?.property || {};
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!address) {
      return NextResponse.json(
        { error: "Missing `address`." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        model: "none",
        feasibilitySummary:
          "## Current Status\n" +
          "GPT-4o is not configured (`OPENAI_API_KEY` missing). Property JSON below is shown raw for development.\n\n" +
          "## Potential for Growth\n" +
          "Add `OPENAI_API_KEY` to `.env.local` and restart the dev server to enable the Zoning Consultant analysis (Current Status / Potential for Growth / Regulatory Hurdles).\n\n" +
          "## Regulatory Hurdles\n" +
          "Without the model, no automated comparison of use vs. max units, lot vs. minimums, or ADU eligibility is performed.\n\n" +
          "```json\n" +
          JSON.stringify(property, null, 2) +
          "\n```",
        disclaimer:
          "Placeholder output—not a zoning determination. Configure OpenAI for full consultant formatting.",
      });
    }

    const userContext = [
      `Property address: ${address}`,
      `Structured property data (JSON):\n${JSON.stringify(property, null, 2)}`,
      "",
      "Perform the three comparisons from your instructions: (1) current use vs. typical maximum allowed dwelling units for the zone family, (2) lot size vs. minimum lot area / per-unit lot rules when data exists, (3) location and zone vs. ADU/accessory-dwelling-style feasibility per the Knowledge Base.",
      "Respond using the required sections: ## Current Status, ## Potential for Growth, ## Regulatory Hurdles.",
    ].join("\n");

    const openaiMessages = [
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: openaiMessages,
        temperature: 0.35,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: "OpenAI request failed", detail: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No content returned from model.";

    return NextResponse.json({
      ok: true,
      model: data?.model || "gpt-4o",
      feasibilitySummary: text,
      disclaimer:
        "Informational only—not legal advice. Verify with your jurisdiction.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Feasibility analysis failed." },
      { status: 500 }
    );
  }
}
