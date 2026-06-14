"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReportCard from "@/components/property/ReportCard";
import OpportunityAssessment from "@/components/property/OpportunityAssessment";

// Inner component reads useSearchParams — must be inside Suspense
function OpportunityReportInner() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (addr) => {
    const target = (addr ?? address).trim();
    if (!target) { setError("Enter a street address."); return; }
    setError("");
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/opportunity/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data.report);
      window.history.replaceState(
        {},
        "",
        `/opportunity-report?address=${encodeURIComponent(target)}`
      );
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run analysis if address is in URL on initial load
  useEffect(() => {
    const urlAddress = searchParams.get("address");
    if (urlAddress && !report && !loading) {
      handleAnalyze(urlAddress);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--deep-navy)]">
            Property Opportunity Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter any US address to generate an AI-powered development opportunity assessment.
          </p>
        </div>

        {/* Address input form */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="305 East 105th Street, New York, NY"
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--construction-teal)] focus:ring-1 focus:ring-[var(--construction-teal)] disabled:opacity-50"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="rounded-lg bg-[var(--deep-navy)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analyzing property&hellip; this may take 10&ndash;20 seconds.
          </div>
        )}

        {/* Report output */}
        {report && !loading && (
          <>
            <ReportCard report={report} />
            <OpportunityAssessment assessment={report.aiAssessment} />

            {/* Data quality / limitations */}
            {report.limitations && report.limitations.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400">
                <span className="font-semibold">Data notes: </span>
                {report.limitations.join(" · ")}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Default export wraps inner component in Suspense — required for useSearchParams in Next.js 15
export default function Page() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-slate-500">Loading…</p>}>
      <OpportunityReportInner />
    </Suspense>
  );
}
