"use client";

import { useState } from "react";

export default function PropertyGallery({ gallery, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = gallery[activeIndex];

  return (
    <div className="space-y-4">
      <div
        className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/20 bg-slate-900"
        style={{ backgroundImage: activeItem.image, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(16,32,47,0.82)] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
            Property Gallery
          </p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-200">{activeItem.title}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {gallery.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              index === activeIndex
                ? "border-[var(--construction-teal)] ring-2 ring-[rgba(45,156,219,0.25)]"
                : "border-slate-200"
            }`}
          >
            <div
              className="h-28 w-full bg-slate-200"
              style={{ backgroundImage: item.image, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div className="bg-white px-4 py-3">
              <p className="text-sm font-semibold text-[var(--deep-navy)]">{item.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
