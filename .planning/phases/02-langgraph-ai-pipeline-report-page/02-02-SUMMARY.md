---
phase: 02-langgraph-ai-pipeline-report-page
plan: "02"
subsystem: langgraph-pipeline
tags: [langgraph, gemini, pipeline, api-route, opportunity-analysis]
dependency_graph:
  requires:
    - "02-01 (LangGraph packages, PLUTO fields, enrich route)"
    - "lib/open-property/fetch-property-intel.mjs"
    - "lib/homeowner-feasibility/zoning-knowledge-base.js"
    - "@langchain/langgraph@1.4.2"
    - "@langchain/google-genai@2.1.31"
  provides:
    - "lib/langgraph/property-pipeline.mjs — compiled 4-node StateGraph (propertyPipeline)"
    - "POST /api/opportunity/analyze — full pipeline trigger returning { ok, report }"
  affects:
    - "Phase 3 marketplace (consumes report.aiAssessment for opportunity listings)"
tech_stack:
  added: []
  patterns:
    - "LangGraph linear StateGraph: START → enrich_property → fetch_zoning_rules → analyze_opportunity → format_report → END"
    - "Plain JS Annotation.Root (no TypeScript generics) — ESM-safe .mjs pattern"
    - "ChatGoogleGenerativeAI.withStructuredOutput with plain JSON schema (no Zod) — Gemini json_schema mode"
    - "Three-tier zoning: NYC PLUTO (live FAR) → Boston assessing → Gemini knowledge base"
    - "Generic error masking in API route — never exposes raw errors containing API keys"
key_files:
  created:
    - lib/langgraph/property-pipeline.mjs
    - app/api/opportunity/analyze/route.js
  modified: []
decisions:
  - "getZoningKnowledgeBaseJson() returns a pre-stringified JSON string — used directly with .slice(0,3000) rather than re-serializing"
  - "analyzeOpportunity node catches all errors and returns minimal valid assessment to keep graph alive even when Gemini fails"
  - "Comment containing e?.message literal removed to pass automated verification check (semantic content preserved)"
  - "format_report uses null (not undefined) for all missing fields — UI renders hyphen for null values"
metrics:
  duration: "3m"
  completed: "2026-06-14T19:22:31Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
requirements_satisfied:
  - PROP-07
  - PROP-10
---

# Phase 02 Plan 02: LangGraph Pipeline + Analyze Route Summary

Compiled 4-node LangGraph StateGraph (`propertyPipeline`) that takes an address → enriches property data via fetchPropertyIntel → extracts live NYC PLUTO FAR data → calls Gemini with structured JSON schema → returns flat opportunity report; wired to `POST /api/opportunity/analyze` with input sanitization and generic error masking.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2.1 | Build lib/langgraph/property-pipeline.mjs — 4-node StateGraph | 1eae5a3 | lib/langgraph/property-pipeline.mjs |
| 2.2 | Create POST /api/opportunity/analyze route | 63472f5 | app/api/opportunity/analyze/route.js |

## Verification Results

- `node -e "import('./lib/langgraph/property-pipeline.mjs').then(m => console.log(typeof m.propertyPipeline.invoke))"` → `function`
- `grep "export const propertyPipeline"` → match
- `grep "propertyPipeline.invoke"` → match in analyze route
- `npm run build` exits 0 — `/api/opportunity/analyze` listed as dynamic route
- No TypeScript generic syntax (`Annotation<`) in property-pipeline.mjs
- No self-HTTP calls in pipeline
- `e?.message` not present in analyze route catch block

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed `e?.message` literal from comment in analyze route**
- **Found during:** Task 2.2 verification
- **Issue:** Automated verification check `!c.includes('e?.message')` failed because the security comment itself contained the literal string `e?.message`
- **Fix:** Rephrased comment from "never return `e?.message` here" to "never return the raw error message" — semantic meaning preserved, literal match removed
- **Files modified:** `app/api/opportunity/analyze/route.js`
- **Commit:** 63472f5

## Known Stubs

None — all pipeline nodes are wired to real data sources. Fields that return null when PLUTO data is missing (buildingDepth, constructionType, buildingStyle via proxdescription) are intentional best-effort proxies.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: prompt-injection | lib/langgraph/property-pipeline.mjs | T-02-02-03 accepted: address injected as data context into Gemini prompt; structured output mode constrains response shape |
| threat_flag: api-key-leak-prevention | app/api/opportunity/analyze/route.js | T-02-02-02 mitigated: outer catch returns generic "Analysis failed." only; server-side console.error for debugging |

## Self-Check: PASSED

- `lib/langgraph/property-pipeline.mjs` — FOUND
- `app/api/opportunity/analyze/route.js` — FOUND
- Commit `1eae5a3` — FOUND
- Commit `63472f5` — FOUND
- `npm run build` → `/api/opportunity/analyze` listed as dynamic route — CONFIRMED
- `propertyPipeline.invoke` typeof → `function` — CONFIRMED
