"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Chat UI for homeowner ADU / additional-unit feasibility.
 * Calls /api/property then /api/feasibility (OpenRouter or OpenAI when configured).
 */
export default function FeasibilityChat() {
  const [address, setAddress] = useState("");
  const [property, setProperty] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  };

  const pushAssistant = useCallback((content) => {
    setMessages((m) => [...m, { role: "assistant", content }]);
    scrollToBottom();
  }, []);

  const pushUser = useCallback((content) => {
    setMessages((m) => [...m, { role: "user", content }]);
    scrollToBottom();
  }, []);

  const fetchProperty = async () => {
    setError("");
    if (!address.trim()) {
      setError("Enter a street address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Property request failed");

      setProperty(data.property);
      pushUser(`Look up property: ${address.trim()}`);
      const p = data.property;
      const census = p.jurisdiction?.censusGeographies;
      const place =
        census?.ok && census.incorporatedPlace
          ? census.incorporatedPlace
          : null;
      const county = census?.ok && census.county ? census.county : null;
      const osm = p.openStreetMap;
      const osmLine =
        osm?.ok && (osm.buildingTypes?.length || osm.landuseAndOpenSpace?.length)
          ? `OSM hints — buildings: ${(osm.buildingTypes || []).slice(0, 5).join(", ") || "—"}; landuse: ${(osm.landuseAndOpenSpace || []).slice(0, 5).join(", ") || "—"}`
          : null;

      pushAssistant(
        [
          "**Open-source property intel**",
          p.dataQuality
            ? `_Quality tag: ${p.dataQuality} (not legal zoning determination)._`
            : "",
          "",
          `**Normalized:** ${p.geocode?.normalized || p.streetLine || "—"}`,
          `**City (geocoder):** ${p.city || "—"}`,
          place ? `**U.S. Census place:** ${place}` : "",
          county ? `**U.S. Census county:** ${county}` : "",
          `**Zoning (hint):** ${p.zoningDistrict}`,
          `**Lot area (sq ft):** ${p.lotAreaSqFt ?? "—"}`,
          `**Use / occupancy hints:** ${p.useAndOccupancy}`,
          osmLine || "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const runFeasibility = async (extraUserMessage) => {
    if (!address.trim() || !property) {
      setError("Look up the property first.");
      return;
    }
    setError("");
    setLoading(true);

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    if (extraUserMessage) {
      historyForApi.push({ role: "user", content: extraUserMessage });
    }

    try {
      const res = await fetch("/api/feasibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          property,
          messages: historyForApi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feasibility request failed");

      const summary = data.feasibilitySummary || "";
      const disc = data.disclaimer ? `\n\n_${data.disclaimer}_` : "";
      const assistantText = `Feasibility summary\n\n${summary}${disc}`;

      setMessages((m) => {
        const next = [...m];
        if (extraUserMessage) {
          next.push({ role: "user", content: extraUserMessage });
        }
        next.push({ role: "assistant", content: assistantText });
        return next;
      });
      scrollToBottom();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[min(640px,70vh)] flex-col overflow-hidden rounded-2xl border border-red-200/90 bg-gradient-to-b from-red-50/90 to-white shadow-lg shadow-red-900/10">
      <div className="border-b border-red-100 bg-red-50/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Homeowner feasibility
        </p>
        <h2 className="text-lg font-bold text-red-950">
          ADU &amp; additional units
        </h2>
        <p className="mt-1 text-sm text-red-900/70">
          Enter your address. We identify the city and load property fields, then
          the LLM summarizes feasibility against typical zoning considerations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-red-100 px-4 py-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, City, ST 12345"
          className="min-w-[200px] flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-400"
          disabled={loading}
        />
        <button
          type="button"
          onClick={fetchProperty}
          disabled={loading}
          className="rounded-xl bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-950 disabled:opacity-50"
        >
          Look up property
        </button>
        <button
          type="button"
          onClick={() => runFeasibility(null)}
          disabled={loading || !property}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-600/25 hover:bg-red-700 disabled:opacity-50"
        >
          Feasibility summary
        </button>
      </div>

      {error ? (
        <p className="px-4 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div
        ref={listRef}
        className="flex-1 select-text space-y-3 overflow-y-auto bg-red-50/20 px-4 py-3 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-red-900/55">
            No messages yet. Enter an address and tap <strong>Look up property</strong>,
            then <strong>Feasibility summary</strong>.
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] cursor-text select-text whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-red-800 text-white shadow-sm"
                    : "border border-red-200 bg-red-50 text-red-950"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading ? (
          <p className="text-xs text-red-700/70">Working…</p>
        ) : null}
      </div>

      <form
        className="flex gap-2 border-t border-red-100 bg-white px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const text = String(fd.get("followup") || "").trim();
          e.currentTarget.reset();
          if (!text) return;
          runFeasibility(text);
        }}
      >
        <input
          name="followup"
          type="text"
          placeholder="Ask a follow-up (e.g. ADU setbacks in my zone?)"
          className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-400"
          disabled={loading || !property}
        />
        <button
          type="submit"
          disabled={loading || !property}
          className="rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
