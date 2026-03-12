import FundingProgressBar from "@/components/tokenization/FundingProgressBar";

export default function TokenPurchaseWidget({ data, progressPercent }) {
  return (
    <aside className="token-card sticky top-24 rounded-[2rem] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--construction-teal)]">
            Purchase Widget
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--deep-navy)]">
            Commit Capital
          </h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Verified
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Metric label="Token Price" value={`$${data.tokenPrice}`} emphasis />
        <Metric label="Est. Annual Yield" value={`${data.estimatedAnnualYield}%`} emphasis />
        <Metric
          label="Minimum Investment"
          value={`$${data.minimumInvestment.toLocaleString()}`}
        />
      </div>

      <div className="mt-6">
        <FundingProgressBar percent={progressPercent} />
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>${data.raisedAmount.toLocaleString()} raised</span>
          <span>${data.fundingGoal.toLocaleString()} target</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          SEC Compliant
        </span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          Real Asset Backed
        </span>
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-2xl bg-[var(--construction-teal)] px-5 py-4 text-base font-bold text-white shadow-lg shadow-sky-200 transition hover:translate-y-[-1px] hover:bg-sky-600"
      >
        Commit Capital
      </button>
    </aside>
  );
}

function Metric({ label, value, emphasis = false }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-2 ${emphasis ? "text-3xl" : "text-xl"} font-bold text-[var(--deep-navy)]`}
      >
        {value}
      </p>
    </div>
  );
}
