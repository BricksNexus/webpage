"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Marketplace" },
  { href: "/about", label: "About" },
  { href: "/tokenization", label: "Tokenization" },
  { href: "/homeowner-feasibility", label: "Feasibility" },
  { href: "/opportunity-report", label: "Opportunity Report" },
];

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/" || pathname === "/index.html";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteChrome() {
  const pathname = usePathname() || "";
  const isAbout = pathname === "/about" || pathname.startsWith("/about/");

  return (
    <header
      className={`site-chrome sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md md:px-6 ${
        isAbout
          ? "border-white/10 bg-slate-950/90 text-slate-100"
          : "border-slate-200/80 bg-white/90 text-slate-800 shadow-sm"
      }`}
    >
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight no-underline hover:opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public asset */}
        <img
          src="/images/BricksNexus_simple_logo.png"
          alt=""
          width={120}
          height={32}
          className="h-8 w-auto"
        />
        <span className={isAbout ? "text-white" : "text-[var(--deep-navy)]"}>BricksNexus</span>
      </Link>
      <nav
        className="flex flex-wrap items-center gap-1 text-sm font-semibold md:gap-2"
        aria-label="Main site"
      >
        {NAV.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1.5 no-underline transition ${
                active
                  ? isAbout
                    ? "bg-white/20 text-white"
                    : "bg-[var(--construction-teal)]/20 text-[var(--deep-navy)]"
                  : isAbout
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[var(--deep-navy)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
        <Link
          href="/login.html"
          className={`rounded-full px-3 py-1.5 text-sm font-semibold no-underline ${
            isAbout
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-[var(--deep-navy)]"
          }`}
        >
          Login
        </Link>
      </nav>
    </header>
  );
}
