# BricksNexus — AI Navigator

> This file is the **router**. Read it first. Follow the links to get exact context before touching anything.

---

## What This Project Is

Next.js App Router + plain JSX (no TypeScript). Real estate intelligence platform:
- Address in → property enrichment (AttomData + PLUTO + Census) → LangGraph AI pipeline → Opportunity Report
- Users publish reports to a browsable Marketplace

Stack: Next.js, React, Tailwind CSS, `react-hook-form`, `lucide-react`, `@langchain/langgraph`, `@langchain/google-genai`

---

## Context Files — Read These Before Editing

| File | What's in it | When to read |
|------|-------------|--------------|
| [`CODEBASE.md`](CODEBASE.md) | Every file, what it does, what it imports/exports | Before creating or editing any file |
| [`API.md`](API.md) | Every API route, request/response shapes, env vars, external APIs | Before touching `app/api/` or calling external services |
| [`COMPONENTS.md`](COMPONENTS.md) | Every component, its props, which page uses it | Before building or editing UI |
| [`STATE.md`](STATE.md) | Build status, phase progress, open todos, known issues | Before starting any new work |

## Deep Codebase Map — `.planning/codebase/`

Seven structured documents produced by parallel analysis agents. Use when you need depth beyond the quick-reference files above.

| Document | What's in it | When to read |
|----------|-------------|--------------|
| [`ARCHITECTURE.md`](.planning/codebase/ARCHITECTURE.md) | System overview, dual-surface design, data flow, API routes, key decisions | Before refactoring or adding a major feature |
| [`STRUCTURE.md`](.planning/codebase/STRUCTURE.md) | Annotated directory tree, every page/component/route/module listed | When you need to locate a specific file or understand the project layout |
| [`STACK.md`](.planning/codebase/STACK.md) | Framework, languages, dependencies, env vars | Before adding a dependency or changing build config |
| [`INTEGRATIONS.md`](.planning/codebase/INTEGRATIONS.md) | All external APIs (PLUTO, AttomData, Gemini, Census, OSM), auth, data flow | Before touching any external service call |
| [`CONVENTIONS.md`](.planning/codebase/CONVENTIONS.md) | Naming, component patterns, CSS approach, LLM prompt structure, frontend design rules | Before writing new code — match existing patterns |
| [`TESTING.md`](.planning/codebase/TESTING.md) | Test coverage (none formal), manual testing approach, quality gates | Before claiming a feature is complete |
| [`CONCERNS.md`](.planning/codebase/CONCERNS.md) | P0–P3 technical debt, security risks, orphaned files, architecture risks | Before making assumptions about code quality |

---

## Hard Rules

- **JSX only. No TypeScript.** Never introduce `.ts` or `.tsx`.
- Run `npm run build` after multi-file changes before reporting done.
- New components → `components/<subdirectory>/` not root-level `.jsx`.
- API routes → `app/api/`. Always use `lib/api-cors.js` for CORS headers.
- LLM calls → `lib/llm-chat.js` only. Do not call Gemini/OpenAI directly.
- Secrets → `.env.local` only. Never commit. Keys: `ATTOMDATA_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL`.
- Property data entry point → `lib/open-property/fetch-property-intel.mjs`. Do not duplicate its logic.
- Git: commit frequently, prefer named files over `git add -A`.

---

## Dev Commands

```bash
npm run dev          # start local dev server (run from /webpage)
npm run build        # production build — always run before done
node scripts/fetch-zoning-by-address.mjs  # zoning CLI
```

---

## Architecture

```
Address Input
  └─▶ POST /api/property/enrich          # census geocode + PLUTO + AttomData
        └─▶ POST /api/opportunity/analyze # LangGraph pipeline (4 nodes)
              └─▶ /opportunity-report     # ReportCard + OpportunityAssessment UI
                    └─▶ POST /api/marketplace  # publish → data/marketplace.json
                          └─▶ /marketplace     # listing page
```

---

## External APIs

| API | Key | Docs |
|-----|-----|------|
| AttomData | `ATTOMDATA_API_KEY` in `.env.local` | https://api.developer.attomdata.com/docs |
| Google Gemini | `GOOGLE_API_KEY` in `.env.local` | via `@langchain/google-genai` |
| NYC PLUTO | no key (Socrata public) | dataset `64uk-42ks` |
| Census Geocoder | no key | `geocode.census.gov` |
| OSM Overpass | no key | public |

---

## Phase Status (update STATE.md when this changes)

| Phase | Name | Status |
|-------|------|--------|
| 1 | Property Data API Layer | ✅ Complete |
| 2 | LangGraph AI Pipeline + Report Page | ✅ Complete |
| 3 | Marketplace | ⬜ Not started |

---

## Update Protocol

**Every time you create or modify a file**, update the matching context file:
- New/edited file → update `CODEBASE.md`
- New/changed API route or env var → update `API.md`
- New/changed component → update `COMPONENTS.md`
- Phase progress or build issue → update `STATE.md`

This keeps the context files accurate so the next AI session doesn't have to re-search.
