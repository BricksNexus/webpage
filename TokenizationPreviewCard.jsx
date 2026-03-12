"use client";

import { BadgeCheck, Coins, Landmark, MapPin } from "lucide-react";

function formatCurrency(value) {
  var amount = Number(value || 0);
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export default function TokenizationPreviewCard({ values }) {
  var name = values.propertyName || "Untitled Tokenization Opportunity";
  var assetType = values.assetType || "Asset Type";
  var address = values.address || "Property address";
  var yieldValue = values.estimatedAnnualYield || "0";
  var tokenPrice = values.tokenPrice || "0";
  var totalCapitalRaise = values.totalCapitalRaise || "0";

  return (
    <div className="token-card rounded-[2rem] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Live Preview
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900">
            Marketplace Card
          </h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
          <BadgeCheck size={14} />
          Draft Ready
        </span>
      </div>

      <article className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="relative min-h-[180px] bg-[linear-gradient(135deg,rgba(26,43,60,0.92),rgba(45,156,219,0.54))]">
          <div className="absolute left-4 top-4 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
            Tokenization
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-sm opacity-80">{assetType}</p>
            <h4 className="mt-1 text-2xl font-black tracking-[-0.03em]">{name}</h4>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <PreviewMetric
              icon={<Coins size={16} />}
              label="Token Price"
              value={formatCurrency(tokenPrice)}
            />
            <PreviewMetric
              icon={<Landmark size={16} />}
              label="Annual Yield"
              value={`${yieldValue || "0"}%`}
              success
            />
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin size={16} />
              <span>{address}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[68%] rounded-full bg-blue-600" />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
              <span>Funding target</span>
              <strong className="text-slate-900">{formatCurrency(totalCapitalRaise)}</strong>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
            >
              Commit Capital
            </button>
            <button
              type="button"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              View Details
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function PreviewMetric({ icon, label, value, success = false }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className={success ? "text-emerald-500" : "text-blue-600"}>{icon}</span>
        <span>{label}</span>
      </div>
      <strong
        className={`mt-3 block text-2xl font-black tracking-[-0.03em] ${
          success ? "text-emerald-500" : "text-slate-900"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}
