"use client";

export default function FundingProgressBar({ percent }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Funding Progress</span>
        <span className="font-bold text-[var(--deep-navy)]">{percent}% sold</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[var(--construction-teal)] transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
