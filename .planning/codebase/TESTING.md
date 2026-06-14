# Testing

_Last updated: 2026-06-14_

---

## Test Setup

**There is no automated test suite.** No test framework is installed or configured.

`package.json` scripts:
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "fetch-zoning": "node scripts/fetch-zoning-by-address.mjs"
}
```

No `test`, `lint`, or `typecheck` script exists. No `jest`, `vitest`, `playwright`, `cypress`, `@testing-library/*`, or any similar package appears in `dependencies` or `devDependencies`.

---

## Test Files

None found. There are no `*.test.*`, `*.spec.*`, `__tests__/`, or `test/` files anywhere in the project.

---

## Test Coverage

**Coverage: 0%.** No unit, integration, or end-to-end tests exist for any part of the codebase including:

- `lib/langgraph/property-pipeline.mjs` (4-node LangGraph pipeline)
- `lib/open-property/fetch-property-intel.mjs` (multi-source property data aggregation)
- `lib/llm-chat.js` (LLM config resolution and key normalization)
- `lib/api-cors.js` (CORS headers)
- All `app/api/` route handlers
- All React components

---

## Manual Testing Approach

Based on the codebase structure and `CLAUDE.md` hard rules, the manual testing workflow is:

**1. Build check (mandatory gate):**
```bash
npm run build
```
`CLAUDE.md` explicitly requires running `npm run build` after multi-file changes before reporting done. This is the only enforced quality gate.

**2. Dev server for UI validation:**
```bash
npm run dev
```
Run from `/webpage`. Visit routes manually in browser:
- `/` → redirects to `/index.html` (legacy marketplace)
- `/tokenization` → `TokenizationOpportunityForm` multi-step flow
- `/homeowner-feasibility` → feasibility chatbot page
- `/opportunity-report` → `ReportCard` + `OpportunityAssessment` display

**3. CLI script for zoning data:**
```bash
node scripts/fetch-zoning-by-address.mjs
```
Used to manually validate the property intel pipeline outside of the HTTP server.

**4. API route testing:** No dedicated HTTP client tooling (Postman, Bruno, etc.) is referenced. Routes are exercised by loading the UI and submitting forms.

**5. LangGraph pipeline:** Validated by submitting an address through the `/opportunity-report` page, which triggers `POST /api/opportunity/analyze`, which invokes `propertyPipeline.invoke()`.

**6. Chatbot validation:** The AI opportunity builder chatbot in `post-opportunity.js` has a built-in demo fallback (`buildDemoPropertyIntel`) — when `/api/property` returns an error, the chatbot degrades gracefully and continues in demo mode. This makes manual testing possible without API keys.

---

## Quality Gates

The only enforced quality gates are:

| Gate | Command | When required |
|------|---------|---------------|
| Production build | `npm run build` | After any multi-file change, before marking work done |
| Visual review | `npm run dev` + browser | For UI/component changes |

No linting configuration exists (no `.eslintrc*`, `eslint.config.*`, `biome.json`, or `.prettierrc*`). There is one `eslint-disable` comment in `SiteChrome.jsx` (`// eslint-disable-next-line @next/next/no-img-element`) suggesting Next.js's built-in ESLint may be active via default Next.js config, but no custom lint rules are configured.

---

## Gaps

The following areas carry the highest risk with zero test coverage:

**Critical — data pipeline correctness:**
- `lib/open-property/fetch-property-intel.mjs`: Multi-source aggregation logic (`buildDerivedSummary`) has complex precedence rules (AttomData → PLUTO → Boston → OSM → fallback). No tests for source priority or null handling.
- `lib/langgraph/property-pipeline.mjs`: The `formatReport` node merges fields from 3+ sources with fallback chains (`attom.yearBuilt || pluto.yearBuiltPluto || null`). Regressions here silently produce `null` fields in the UI.
- `splitAddressForAttom()`: Address parsing logic used to call AttomData — no tests for edge cases (no comma, city-only input, etc.).

**High — LLM config:**
- `lib/llm-chat.js` `normalizeSecret()`: Key normalization (strip CRLF, strip "Bearer " prefix) is untested. A malformed key silently returns `""` and disables LLM entirely.
- `getLlmChatConfig()`: Provider fallback order (OpenRouter → OpenAI → `null`) is untested.

**High — form state:**
- `TokenizationOpportunityForm.jsx`: Multi-step form with `localStorage` draft persistence. `isPublishReady` memo and step validation (`trigger(fieldsByStep[currentStep])`) are not covered.
- `post-opportunity.js`: 1572-line vanilla JS form controller with complex step validation, chronogram row management, file reading, and chatbot integration. Entirely manual-tested.

**Medium — API route contracts:**
- All `app/api/` routes: Request/response shapes, CORS preflight handling, and error responses are untested. A change to `fetchPropertyIntel`'s return shape would break the API route silently.

**Recommended minimum test additions (priority order):**
1. Unit tests for `buildDerivedSummary` in `fetch-property-intel.mjs` — covers the most complex branching logic
2. Unit tests for `splitAddressForAttom` — edge cases in address parsing
3. Unit tests for `normalizeSecret` in `llm-chat.js`
4. Integration test for `propertyPipeline.invoke()` with a mock LLM and fixture property data
5. Build CI step (GitHub Actions or similar) to automate `npm run build` on every push
