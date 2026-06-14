import Link from "next/link";
import FeasibilityChat from "@/components/homeowner-feasibility/FeasibilityChat";

export const metadata = {
  title: "Homeowner feasibility · BricksNexus",
  description:
    "Chat assistant to explore ADUs and additional housing units using property data and Google Gemini.",
};

export default function HomeownerFeasibilityPage() {
  return (
    <main className="token-shell min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-[var(--construction-teal)] hover:underline"
        >
          ← Back
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--deep-navy)]">
          Can I add more housing on my lot?
        </h1>
        <p className="mt-2 text-slate-600">
          This route uses <code className="rounded bg-slate-100 px-1">/api/property</code> for
          parcel-style fields and <code className="rounded bg-slate-100 px-1">/api/feasibility</code>{" "}
          for the zoning consultant summary via{" "}
          <strong>Google Gemini</strong>. Set{" "}
          <code className="rounded bg-slate-100 px-1">GEMINI_API_KEY</code> in{" "}
          <code className="rounded bg-slate-100 px-1">.env.local</code> or Vercel environment
          variables (get a key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            className="font-semibold text-[var(--construction-teal)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AI Studio
          </a>
          ). Default model is <code className="rounded bg-slate-100 px-1">gemini-2.0-flash</code>; override with{" "}
          <code className="rounded bg-slate-100 px-1">GEMINI_MODEL</code>.
        </p>
        <div className="mt-8">
          <FeasibilityChat />
        </div>
      </div>
    </main>
  );
}
