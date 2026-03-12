"use client";

import { useState } from "react";

const TABS = ["overview", "financials", "documents", "blockchain"];

export default function TokenDetailTabs({ data }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? "bg-[var(--construction-teal)] text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? <OverviewTab data={data} /> : null}
      {activeTab === "financials" ? <FinancialsTab data={data} /> : null}
      {activeTab === "documents" ? <DocumentsTab data={data} /> : null}
      {activeTab === "blockchain" ? <BlockchainTab data={data} /> : null}
    </div>
  );
}

function OverviewTab({ data }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="token-card rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold text-[var(--deep-navy)]">Overview</h3>
        <p className="mt-4 leading-7 text-slate-600">{data.description}</p>

        <div className="mt-6">
          <h4 className="text-lg font-bold text-[var(--deep-navy)]">Investment Thesis</h4>
          <ul className="mt-3 space-y-3">
            {data.investmentThesis.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="token-card rounded-[2rem] p-6">
        <h4 className="text-lg font-bold text-[var(--deep-navy)]">Location Map</h4>
        <div className="mt-4 flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          Map Placeholder
          <br />
          {data.location}
        </div>
      </div>
    </div>
  );
}

function FinancialsTab({ data }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="token-card rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold text-[var(--deep-navy)]">Capital Stack</h3>
        <div className="mt-5 overflow-hidden rounded-full bg-slate-200">
          <div className="flex h-5 w-full">
            {data.capitalStack.map((segment) => (
              <div
                key={segment.label}
                className="h-full"
                style={{ width: `${segment.value}%`, backgroundColor: segment.color }}
                title={`${segment.label}: ${segment.value}%`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {data.capitalStack.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-slate-600">{segment.label}</span>
              </div>
              <span className="font-bold text-[var(--deep-navy)]">{segment.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="token-card rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold text-[var(--deep-navy)]">Projected Cash Flow</h3>
        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">Year</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Distributions</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Total Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.projectedCashFlow.map((row) => (
                <tr key={row.year}>
                  <td className="px-4 py-3 font-medium text-[var(--deep-navy)]">{row.year}</td>
                  <td className="px-4 py-3 text-slate-600">{row.revenue}</td>
                  <td className="px-4 py-3 text-slate-600">{row.distributions}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--construction-teal)]">
                    {row.totalReturn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ data }) {
  return (
    <div className="token-card rounded-[2rem] p-6">
      <h3 className="text-2xl font-bold text-[var(--deep-navy)]">Document Vault</h3>
      <div className="mt-5 space-y-4">
        {data.documents.map((document) => (
          <div
            key={document.id}
            className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                PDF
              </div>
              <div>
                <p className="font-semibold text-[var(--deep-navy)]">{document.name}</p>
                <p className="text-sm text-slate-500">
                  {document.type} · {document.size}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockchainTab({ data }) {
  var truncated = `${data.smartContractAddress.slice(0, 8)}...${data.smartContractAddress.slice(-6)}`;

  return (
    <div className="token-card rounded-[2rem] p-6">
      <h3 className="text-2xl font-bold text-[var(--deep-navy)]">Blockchain Registry</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ChainMetric label="Smart Contract" value={truncated} />
        <ChainMetric label="Network" value={data.network} />
        <a
          href={data.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-[1.5rem] bg-slate-50 p-4 transition hover:bg-sky-50"
        >
          <p className="text-sm text-slate-500">Explorer</p>
          <p className="mt-2 font-semibold text-[var(--construction-teal)]">View on Explorer</p>
        </a>
      </div>
    </div>
  );
}

function ChainMetric({ label, value }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-[var(--deep-navy)]">{value}</p>
    </div>
  );
}
