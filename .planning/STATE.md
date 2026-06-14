# BricksNexus Property Intelligence — State

**Project:** BricksNexus Property Intelligence (BNX)
**Initialized:** 2026-06-14
**Branch:** dev

---

## Current Status

| Phase | Name | Status | Plans | Last Activity |
|-------|------|--------|-------|---------------|
| 1 | Property Data API Layer | Ready to plan | — | 2026-06-14 |
| 2 | LangGraph AI Pipeline + Report Page | Not started | — | — |
| 3 | Marketplace | Not started | — | — |

## Active Phase

**None** — run `/gsd-discuss-phase 1` to begin Phase 1.

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-14 | LangGraph for AI pipeline | User specified; multi-step graph enables data enrichment → analysis orchestration |
| 2026-06-14 | AttomData for owner/block/lot | API key provisioned; US nationwide coverage |
| 2026-06-14 | JSON file for marketplace storage | No database — simple for v1 |
| 2026-06-14 | Coarse granularity — 3 phases | Small feature set; move fast |
| 2026-06-14 | YOLO mode | Auto-approve plans and execute |

## Blockers

None.

## Notes

- Existing code: `lib/open-property/attom.mjs` partially written but incomplete
- `lib/open-property/fetch-property-intel.mjs` has nationwide OSM + Census pipeline
- `nyc.mjs` and `boston.mjs` are city-specific connectors (NYC PLUTO, Boston Assessing)
- LangGraph must be installed: `npm install @langchain/langgraph @langchain/google-genai`
