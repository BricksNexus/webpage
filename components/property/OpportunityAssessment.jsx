/**
 * OpportunityAssessment — AI-generated opportunity analysis panel
 * Props:
 *   assessment: report.aiAssessment object
 */
export default function OpportunityAssessment({ assessment }) {
  if (!assessment) return null;

  const farPct = assessment.farAllowed > 0
    ? Math.round((assessment.farUsed / assessment.farAllowed) * 100)
    : null;

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          AI Opportunity Assessment
        </h2>
      </div>

      <div className="px-5 py-5">
        {/* Status badges */}
        <div className="mb-5 flex flex-wrap gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            assessment.canBuildMore
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            {assessment.canBuildMore ? "Can build more units" : "At or near maximum density"}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            assessment.canAddFloors
              ? "bg-sky-50 text-sky-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            {assessment.canAddFloors ? "Can add floors" : "At height limit"}
          </span>
        </div>

        {/* FAR metrics */}
        <div className="mb-5 grid grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {assessment.farUsed > 0 ? assessment.farUsed.toFixed(2) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">FAR Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">
              {assessment.farAllowed > 0 ? assessment.farAllowed.toFixed(2) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">FAR Allowed</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${assessment.farRemaining > 0 ? "text-emerald-600" : "text-slate-400"}`}>
              {assessment.farAllowed > 0 ? assessment.farRemaining.toFixed(2) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">FAR Remaining</div>
          </div>
        </div>

        {/* FAR usage bar */}
        {farPct !== null && (
          <div className="mb-5">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>FAR Usage</span>
              <span>{farPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full transition-all ${farPct >= 90 ? "bg-rose-400" : farPct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${Math.min(farPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stories */}
        {(assessment.currentStories > 0 || assessment.heightLimitStories > 0) && (
          <div className="mb-5 flex gap-6 text-sm">
            <div>
              <span className="text-slate-500">Current Stories: </span>
              <span className="font-semibold text-slate-900">{assessment.currentStories || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">Height Limit: </span>
              <span className="font-semibold text-slate-900">{assessment.heightLimitStories || "—"} stories</span>
            </div>
          </div>
        )}

        {/* Conversion opportunity */}
        {assessment.conversionOpportunity && assessment.conversionOpportunity !== "None identified" && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Conversion: </span>
            {assessment.conversionOpportunity}
          </div>
        )}

        {/* Development opportunities list */}
        {assessment.opportunities && assessment.opportunities.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Development Opportunities</h3>
            <ul className="space-y-2">
              {assessment.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 shrink-0 text-emerald-500">&#10003;</span>
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI summary narrative */}
        {assessment.summary && (
          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700">
            {assessment.summary.split("\n").filter(Boolean).map((para, i) => (
              <p key={i} className={i > 0 ? "mt-3" : ""}>{para}</p>
            ))}
          </div>
        )}

        {/* Publish button — Phase 3 placeholder per CONTEXT.md */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => alert("Coming soon — marketplace launches in Phase 3.")}
            className="rounded-lg bg-[var(--deep-navy)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 active:opacity-80"
          >
            Publish to Marketplace
          </button>
        </div>
      </div>
    </section>
  );
}
