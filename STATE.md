# STATE.md — Build Status & Active Work

> Maintained by AI. Update at the start and end of every session, after every build run, and whenever phase status changes.

---

## Current Phase

**Phase 3 — Marketplace** (not started)

Depends on: Phase 2 (complete)

---

## Phase Progress

| Phase | Name | Status | Plans | Commits |
|-------|------|--------|-------|---------|
| 1 | Property Data API Layer | ✅ Complete | 1/1 | dd098f4, 0793c04, 64d5fe5 |
| 2 | LangGraph AI Pipeline + Report Page | ✅ Complete | 3/3 | (see `.planning/phases/02-*/`) |
| 3 | Marketplace | ⬜ Not started | 0/1 | — |

---

## Last Build

**Status:** ✅ Green (after Phase 2 completion)
**Command:** `npm run build`
**Last run:** 2026-06-14
**Issues:** None

---

## What's Working

- `POST /api/property/enrich` — returns full property data for any US address
- NYC enrichment pipeline — geosearch → PLUTO → ownerName, zoning, blockLot all populated
- Logo display — fixed with inline styles in `SiteChrome.jsx`
- `/opportunity-report` page — form + ReportCard + OpportunityAssessment rendered
- LangGraph pipeline — `lib/langgraph/property-pipeline.mjs` invokes 4-node graph
- `POST /api/opportunity/analyze` — wired to pipeline, returns AI assessment

---

## Known Issues

- `NYC_GEOCLIENT_APP_ID` / `NYC_GEOCLIENT_APP_KEY` not configured — OK, free geosearch fallback works
- Root-level `.jsx` and `.mjs` files are legacy duplicates — canonical versions are in `lib/` and `components/`
- `public/` HTML pages are static legacy pages — not connected to Next.js app router

---

## Phase 3 — What Needs to Be Built

Per ROADMAP.md:

1. `app/marketplace/page.jsx` — listing page (`GET /api/marketplace`)
2. `components/property/OpportunityCard.jsx` — card with address, AI snippet, zoning class
3. `app/api/marketplace/route.js` — `GET` returns all; `POST` saves to `data/marketplace.json`
4. `data/marketplace.json` — created on first publish (initialize as `[]`)
5. Wire "Publish to Marketplace" button in `OpportunityAssessment.jsx` → `POST /api/marketplace`
6. Add `/marketplace` to `SiteChrome.jsx` nav
7. `npm run build` must pass

---

## Open TODOs

- [ ] Build Phase 3 Marketplace
- [ ] Add `/marketplace` to SiteChrome nav (when Phase 3 starts)
- [ ] Clean up root-level legacy duplicate files (low priority, non-breaking)

---

## Key Decisions (condensed — full log in `.planning/STATE.md`)

| Decision | Outcome |
|----------|---------|
| No TypeScript | JSX only — never introduce `.ts/.tsx` |
| LLM calls | `lib/llm-chat.js` only — no direct SDK calls |
| Marketplace storage | `data/marketplace.json` — no database for v1 |
| Geosearch fallback | Free NYC geosearch replaces paid Geoclient |
| Logo fix | Inline styles in `SiteChrome.jsx` (Tailwind `h-8` was overridden by global CSS) |

---

## Dev Server

Run from `/webpage` directory:
```bash
cd "c:/Users/John Doe/Desktop/New folder (5)/webpage"
npm run dev
```

Local: http://localhost:3000
