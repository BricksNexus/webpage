"use client";

import { useMemo, useState } from "react";

export default function InvestmentCalculator({ tokenPrice, annualYield }) {
  const [investmentAmount, setInvestmentAmount] = useState(1000);

  const metrics = useMemo(() => {
    var amount = Number(investmentAmount) || 0;
    var monthlyIncome = (amount * (annualYield / 100)) / 12;
    var totalReturn = amount * (1 + annualYield / 100);

    return {
      monthlyIncome,
      totalReturn,
      tokens: tokenPrice > 0 ? amount / tokenPrice : 0
    };
  }, [annualYield, investmentAmount, tokenPrice]);

  return (
    <div className="token-card rounded-3xl p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--construction-teal)]">
          Investment Calculator
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[var(--deep-navy)]">
          Model Your Allocation
        </h3>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-600">
          Capital Commitment
        </span>
        <input
          type="number"
          min="0"
          step="100"
          value={investmentAmount}
          onChange={(event) => setInvestmentAmount(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-[var(--deep-navy)] outline-none ring-0 transition focus:border-[var(--construction-teal)]"
        />
      </label>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Projected Monthly Income"
          value={`$${metrics.monthlyIncome.toFixed(2)}`}
        />
        <MetricCard
          label="Estimated Total Return"
          value={`$${metrics.totalReturn.toFixed(2)}`}
        />
        <MetricCard
          label="Approx. Tokens"
          value={metrics.tokens.toFixed(1)}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-[var(--deep-navy)]">{value}</p>
    </div>
  );
}
