# Code Conventions

_Last updated: 2026-06-14_

---

## File & Naming Conventions

**Rule: JSX only. No TypeScript.** `.ts` and `.tsx` are explicitly forbidden per `CLAUDE.md`. All React files use `.jsx`. All library/utility files use `.js` or `.mjs`.

| Pattern | Example |
|---------|---------|
| React components | `PascalCase.jsx` — `ReportCard.jsx`, `SiteChrome.jsx` |
| Page directories | `app/(pages)/...` with `page.jsx` entry point |
| Lib utilities | `camelCase.js` — `llm-chat.js`, `api-cors.js` |
| ESM-only lib files | `.mjs` suffix — `fetch-property-intel.mjs`, `property-pipeline.mjs` |
| Public static scripts | `kebab-case.js` — `post-opportunity.js`, `post-opportunity-chatbot.js` |
| Component subdirectories | `components/<category>/ComponentName.jsx` — never root-level |

---

## Component Patterns

**Structure:** Function components only. No class components observed anywhere.

**Directive at top of client components:**
```jsx
"use client";
```
Only applied where needed (hooks, browser APIs). `SiteChrome.jsx` uses it; `ReportCard.jsx` does not (pure render).

**Sub-components defined in same file:** Small helper components (e.g. `FieldRow`, `Stepper`, `SectionHeading`, `Field`, `FileDropzone`, `Toast`) are defined as plain functions in the same `.jsx` file as their parent, not exported. Only the primary component is exported as `export default`.

**Props:** Destructured in function signature. No PropTypes. No TypeScript interfaces.

**Null guard pattern:**
```jsx
// Early return when data absent
export default function ReportCard({ report }) {
  if (!report) return null;
  // ...
}

// Conditional render inline
{toast ? <Toast toast={toast} /> : null}
```

**Conditional class construction:** Inline ternary with template literals. No `clsx` or `classnames` library.
```jsx
className={`rounded-full px-3 py-1.5 no-underline transition ${
  active ? "bg-[var(--construction-teal)]/20 text-[var(--deep-navy)]"
          : "text-slate-600 hover:bg-slate-100"
}`}
```

**File annotation pattern:** Context links in JSDoc comment at top of file:
```jsx
/**
 * ReportCard — Property Information + Land Information
 * Props:
 *   report: the full report object from /api/opportunity/analyze
 * Context: COMPONENTS.md (ReportCard) | API.md (POST /api/opportunity/analyze response shape)
 */
```

---

## CSS Patterns

**Primary approach: Tailwind CSS utility classes.** All React components use Tailwind exclusively — no component-scoped CSS files, no CSS modules.

**Global CSS file:** `app/globals.css` — minimal. Contains:
- `@import "tailwindcss"` (v4 syntax — no `@tailwind base/components/utilities`)
- CSS custom properties on `:root`
- Semantic layout classes: `.token-shell`, `.token-card`, `.token-grid-overlay`
- Mobile resets (font-size 16px on inputs at ≤640px)

**CSS variables (defined in `:root`):**
```css
--deep-navy: #1a2b3c
--construction-teal: #2d9cdb
--soft-sky: #d9edf7
--ink: #10202f
```

Referenced in Tailwind via `text-[var(--deep-navy)]`, `bg-[var(--construction-teal)]/20`.

**Body background:** Radial + linear gradient defined in `globals.css` — not a Tailwind class.

**Custom class usage in JSX:** `.token-card` and `.token-shell` are applied directly in JSX (`className="token-card rounded-[2rem] p-6"`), combining with Tailwind utilities.

**Border-radius:** Large custom radii used: `rounded-[2rem]`, `rounded-[1.75rem]`, `rounded-[1.5rem]`, `rounded-[1.35rem]`. Standard Tailwind radii (`rounded-xl`, `rounded-full`) also used for smaller elements.

**Public HTML scripts:** `public/` JS files target CSS classes via `querySelector`/`classList` — no Tailwind (these are vanilla JS on HTML pages, not React).

**Icon library:** Lucide React (`lucide-react`) exclusively. No other icon library imported.

---

## JavaScript Patterns

**Module system split:**
- React components (`app/`, `components/`): CommonJS-compatible JSX, no explicit `export`/`import` for types since no TypeScript
- Library files (`lib/*.js`): ES Modules with named exports (`export function`, `export const`)
- Deep lib files (`lib/**/*.mjs`): ESM with `.mjs` extension enforcing module mode
- Public scripts (`public/*.js`): IIFE or `DOMContentLoaded` vanilla JS, `var` declarations, no modules

**`var` in public scripts:** Public vanilla JS files (`post-opportunity.js`, `post-opportunity-chatbot.js`) use `var` throughout for ES5 compatibility in static HTML context.

**`const`/`let` in lib and React:** Modern `const`/`let` used in all `lib/` and React component files.

**`var` in React components (notable exception):** `TokenizationOpportunityForm.jsx` uses `var` throughout — a deliberate style choice matching the public script conventions for this file.

**Async patterns:**
- `async/await` used for all LLM and API calls in `lib/` files
- `Promise.all` for parallel file reads in public JS (`post-opportunity.js`)
- Fetch with `.json().catch(() => ({}))` fallback for safe JSON parsing

**Error handling in pipeline nodes:** Each LangGraph node wraps in `try/catch` and returns a degraded-but-valid result rather than throwing:
```js
} catch (e) {
  return { property: { ok: false, error: e?.message || "enrich_property failed" } };
}
```

**Null coalescing pattern:** `??` used extensively in lib files. Optional chaining (`?.`) used for nested object access.

**`escapeHtml` helper:** Defined locally in each public vanilla JS file using a throwaway `div.textContent` pattern — not a shared utility.

---

## API Route Patterns

**Location:** All API routes in `app/api/` using Next.js App Router conventions (`route.js`).

**CORS:** Every route must use `lib/api-cors.js`. The export is:
```js
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```
Import and spread into every `Response` constructor. Handle `OPTIONS` preflight.

**Response format:** `Response` object with `JSON.stringify` body and explicit headers including `CORS_HEADERS`.

**Property data entry point:** `lib/open-property/fetch-property-intel.mjs` — single canonical function `fetchPropertyIntel(address, options)`. API routes must import this; never duplicate its logic.

**LLM calls:** Must route through `lib/llm-chat.js` `getLlmChatConfig()` for OpenRouter/OpenAI. Never call Gemini/OpenAI directly from a route — the LangGraph pipeline (`lib/langgraph/property-pipeline.mjs`) calls `@langchain/google-genai` directly and is the exception because it uses structured output.

---

## LLM / AI Patterns

**LangGraph pipeline:** `lib/langgraph/property-pipeline.mjs` defines a 4-node linear `StateGraph`:
1. `enrich_property` — calls `fetchPropertyIntel()` directly (no HTTP)
2. `fetch_zoning_rules` — three-tier: NYC PLUTO → Boston → Gemini knowledge
3. `analyze_opportunity` — Gemini structured output via `withStructuredOutput(schema)`
4. `format_report` — merges all state into a flat UI-ready object

**State definition:** `Annotation.Root` with `reducer: (x, y) => y ?? x` (last write wins). Plain JS only — no TypeScript generics.

**Structured output schema:** Plain JS object with `title`, `type`, `properties`, `required`. Schema must use only `string`/`number`/`boolean`/`array` — no `null` union types (Gemini constraint).

**Prompt construction:** Template literal functions (e.g. `buildAnalysisPrompt(property, zoningRules)`). Property context injected as a labeled block. Zoning knowledge base truncated to 3000 chars: `zoningKBString.slice(0, 3000)`.

**Gemini model config:**
```js
new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
})
```

**OpenRouter/OpenAI chat config** (`lib/llm-chat.js`): Checks `OPENROUTER_API_KEY` first, falls back to `OPENAI_API_KEY`. Normalizes keys (trims CRLF, strips accidental "Bearer " prefix). Returns `null` if no key configured.

**Chatbot in public JS** (`post-opportunity.js`): Embeds an AI Opportunity Builder chatbot as an IIFE inside `DOMContentLoaded`. Calls `/api/property` and `/api/feasibility` via `fetch`. Falls back to `buildDemoPropertyIntel()` (client-side heuristics) when API unavailable. The simple chatbot in `post-opportunity-chatbot.js` uses hardcoded template strings — no API calls.

---

## Import Conventions

**Path alias:** `@/` maps to project root (configured in `jsconfig.json` `baseUrl: "."`, `paths: { "@/*": ["./*"] }`).

**Usage pattern:**
```jsx
import SiteChrome from "@/components/site/SiteChrome";
import TokenizationPreviewCard from "@/components/tokenization/TokenizationPreviewCard";
```

**Next.js imports first, then internal:**
```jsx
import Link from "next/link";
import { usePathname } from "next/navigation";
// then @/ imports
```

**React hooks imported individually:**
```jsx
import { useEffect, useMemo, useRef, useState } from "react";
```

**No barrel/index files observed** for component directories — each component imported directly by path.

**`.mjs` lib files use relative imports** among themselves:
```js
import { fetchCensusGeographies } from "./census-geographies.mjs";
import { fetchNycRecords } from "./cities/nyc.mjs";
```

---

## Frontend Design Rules

Source: `FRONTEND_DESIGN_RULES.md` (at repo root, one level above `webpage/`).

**Typography:**
- One font family per design. Body currently uses `Arial, Helvetica, sans-serif` (set in `globals.css`) — design rules call for Inter/Geist. New UI should use a single clean sans-serif.
- Large text (≥32px): `letter-spacing: -2% to -3%`, `line-height: 110–120%`. In Tailwind: `tracking-[-0.05em]` (used in `TokenizationOpportunityForm.jsx` on h1).
- Body: `line-height: 140–160%`. Tailwind: `leading-7` (28px at 16px base).
- Weights: 400 body, 500 UI labels, 600–700 headings.

**Color system:**
- Brand primary: `--construction-teal: #2d9cdb` (blue). Semantic use: blue = action/trust, emerald = success, rose = error/destructive.
- Semantic colors in use: `text-blue-600` (CTAs, active steps), `bg-emerald-500` (completed steps), `text-rose-500` (form errors), `text-slate-*` (text hierarchy).
- Never use arbitrary bright colors without semantic meaning.

**Spacing:** 4pt grid. Use Tailwind spacing tokens (`p-4`, `p-6`, `gap-8`, etc.). Major section separation: `gap-8` (32px).

**Component states (mandatory):**
- Buttons: default, hover, active, disabled. Loading state for async actions.
- Inputs: default, focus (`focus:border-blue-600`), error (`border-rose-300 bg-rose-50/40`).
- Disabled: `disabled:cursor-not-allowed disabled:opacity-40` (Back button pattern in `TokenizationOpportunityForm.jsx`).

**Cards:**
- Light mode: subtle border OR soft shadow, not both. Use `.token-card` class for the glassmorphism card style (border + `backdrop-filter: blur`).
- Min padding 16px, typical 24px (`p-6`).

**Toasts:** Bottom-right (`fixed bottom-5 right-5`). Auto-dismiss after ~3200ms for success; color-coded via semantic dot (emerald = success, rose = error). Implemented as inline `<Toast>` component in `TokenizationOpportunityForm.jsx`.

**Icons:** Lucide React only. Match icon size to adjacent text line-height (`size={16}` for small buttons, `size={18}` for step icons, `size={24}` for feature icons).

**DO NOT:**
- Mix icon libraries (Lucide only)
- Use emojis as UI affordances
- Use `border-radius: 20px` on buttons — use `rounded-[1.35rem]` to `rounded-[2rem]` for cards, `rounded-full` for pills, `rounded-2xl` for interactive cards
- Add heavy shadows in any mode
- Use purple→blue gradients
- Duplicate KPI blocks on the same page
