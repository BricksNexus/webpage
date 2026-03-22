export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="token-card max-w-2xl rounded-[2rem] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--construction-teal)]">
          BricksNexus
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--deep-navy)]">
          Tokenization Opportunity Demo
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Open the high-fidelity investor detail page built in Next.js and Tailwind.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/tokenization"
            className="inline-flex rounded-full bg-[var(--construction-teal)] px-6 py-3 text-base font-bold text-white transition hover:translate-y-[-1px] hover:bg-sky-600"
          >
            View Tokenization Opportunity
          </a>
          <a
            href="/homeowner-feasibility"
            className="inline-flex rounded-full border-2 border-[var(--deep-navy)] px-6 py-3 text-base font-bold text-[var(--deep-navy)] transition hover:bg-slate-50"
          >
            Homeowner feasibility chat
          </a>
        </div>
      </div>
    </main>
  );
}
