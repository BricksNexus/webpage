"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Chat UI for homeowner ADU / additional-unit feasibility.
 * Calls /api/property then /api/feasibility (GPT-4o when configured).
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
    <div className="flex h-[min(640px,70vh)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--construction-teal)]">
          Homeowner feasibility
        </p>
        <h2 className="text-lg font-bold text-[var(--deep-navy)]">
          ADU &amp; additional units
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your address. We identify the city and load property fields, then
          GPT-4o summarizes feasibility against typical zoning considerations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, City, ST 12345"
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--construction-teal)]"
          disabled={loading}
        />
        <button
          type="button"
          onClick={fetchProperty}
          disabled={loading}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Look up property
        </button>
        <button
          type="button"
          onClick={() => runFeasibility(null)}
          disabled={loading || !property}
          className="rounded-xl bg-[var(--construction-teal)] px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          Feasibility summary
        </button>
      </div>

      {error ? (
        <p className="px-4 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-slate-500">
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
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-slate-800 text-white"
                    : "border border-slate-100 bg-slate-50 text-slate-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading ? (
          <p className="text-xs text-slate-500">Working…</p>
        ) : null}
      </div>

      <form
        className="flex gap-2 border-t border-slate-100 px-4 py-3"
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
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--construction-teal)]"
          disabled={loading || !property}
        />
        <button
          type="submit"
          disabled={loading || !property}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
