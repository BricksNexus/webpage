# BricksNexus Property Intelligence

## What This Is

A property analysis and opportunity marketplace layered on top of the existing BricksNexus real estate platform. Users input a property address; the system enriches it with public data (zoning, use/occupancy, owner identity, block/lot), runs AI analysis via a LangGraph pipeline, and produces a structured **Property Opportunity Report**. Users can publish analyzed properties to a **Marketplace** where construction contacts and property investors can discover development opportunities.

**Core Value:** Address in → Opportunity Report out → Published to marketplace.

## Context

- **Runtime:** Next.js App Router, plain JSX (no TypeScript), Tailwind CSS, React
- **AI stack:** Google Gemini (gemini-2.5-flash) via `lib/llm-chat.js`; new LangGraph pipeline to be added
- **Data APIs:** AttomData (owner, block/lot, assessed value), Google Gemini, existing open-source pipeline (OSM/Census/PLUTO/Boston)
- **Existing infrastructure:** `lib/open-property/fetch-property-intel.mjs` (nationwide), `nyc.mjs`, `boston.mjs`, `geocode.mjs`, `lib/open-property/attom.mjs` (partial, in-progress)
- **Secrets:** `ATTOMDATA_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL` all in `.env.local`

## Target Users

1. **Property owners** who want to understand what their property is worth / what can be built
2. **Contractors and developers** in New York who want to find development opportunities with motivated owners

## Requirements

### Validated (existing capabilities)

- ✓ Property geocoding via Census geocoder
- ✓ OSM property data (Overpass API)
- ✓ City-specific connectors: NYC PLUTO, Boston Assessing
- ✓ AI feasibility chat via Gemini
- ✓ Existing marketplace UI shell (BricksNexus tokenization)

### Active (new — this milestone)

- [ ] **PROP-01**: User can input an address and receive a structured Property Opportunity Report
- [ ] **PROP-02**: Report includes owner name (from AttomData)
- [ ] **PROP-03**: Report includes block & lot number (from AttomData)
- [ ] **PROP-04**: Report includes validated/formatted address
- [ ] **PROP-05**: Report includes zoning classification and buildable area info (from city data)
- [ ] **PROP-06**: Report includes use & occupancy data (from property tax / AttomData)
- [ ] **PROP-07**: AI generates development opportunity assessment from zoning + use data
- [ ] **PROP-08**: User can publish a report as an Opportunity to the marketplace
- [ ] **PROP-09**: Marketplace page lists published opportunities as browsable cards
- [ ] **PROP-10**: LangGraph orchestrates the data enrichment + AI analysis pipeline

### Out of Scope (v1)

- User authentication / accounts — no login for now
- Payment / investment flows — existing tokenization not touched
- Property images / media uploads
- Mobile app

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph for AI pipeline | User specified; enables multi-step stateful graph for data enrichment → analysis. Reference: deepagents repo for multi-agent patterns | Pending implementation |
| AttomData for owner/block/lot | API key already provisioned; covers US nationwide | Confirmed |
| Gemini 2.5 Flash for AI analysis | Already configured in env; fast and capable | Confirmed |
| Marketplace stored in JSON file | No database — keep it simple for v1 | Pending confirmation |
| JSX only, no TypeScript | Existing project convention — do not introduce TS | Locked |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

---
*Last updated: 2026-06-14 after initialization*
