# Tech Stack

_Last updated: 2026-06-14_

## Runtime & Framework

- **Next.js** (`latest` pin) — App Router, server components, API routes under `app/api/`
- **React** (`latest`) + **React DOM** (`latest`) — UI layer
- **Node.js** — runtime for Next.js server-side execution; no explicit version pinned in `.nvmrc`
- App name: `bricksnexus-tokenization-app` (`package.json`)

## Languages

- **JavaScript (JSX)** — all source files. **No TypeScript.** Hard rule: never introduce `.ts` or `.tsx`.
- Module format: ESM (`.mjs`) for lib modules (`lib/langgraph/`, `lib/open-property/`); CJS-compatible `.js` for route handlers and some lib files
- Path alias `@/*` maps to repo root (configured in `jsconfig.json`)

## Styling

- **Tailwind CSS** (`latest`) — utility-first; imported via `@import "tailwindcss"` in `app/globals.css`
- **PostCSS** (`latest`) with `@tailwindcss/postcss` plugin (`postcss.config.mjs`)
- Custom CSS variables defined in `:root` in `app/globals.css`: `--deep-navy`, `--construction-teal`, `--soft-sky`, `--ink`
- Base font: `Arial, Helvetica, sans-serif`; background: radial + linear gradient

## State Management

- **React Hook Form** (`react-hook-form`, `latest`) — form state for address input flows
- No global state library (no Redux, Zustand, Jotai). Component-local `useState`/`useEffect` for UI state.
- Server state flows through Next.js API routes; results passed as props or via `fetch` from client components.

## Build & Tooling

- **Next.js CLI** — `npm run dev` (dev server), `npm run build` (production build), `npm run start`
- `next.config.mjs` — minimal config; defines one redirect: `/about.html` → `/about` (non-permanent)
- `jsconfig.json` — sets `baseUrl: "."` and `@/*` path alias
- `postcss.config.mjs` — single plugin: `@tailwindcss/postcss`
- Custom script: `node scripts/fetch-zoning-by-address.mjs` (zoning CLI, aliased as `npm run fetch-zoning`)

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | latest | App Router framework, API routes, SSR |
| `react` | latest | UI component model |
| `react-dom` | latest | DOM rendering |
| `react-hook-form` | latest | Address/form input state management |
| `@langchain/langgraph` | ^1.4.2 | 4-node stateful AI pipeline (`lib/langgraph/property-pipeline.mjs`) |
| `@langchain/google-genai` | ^2.1.31 | `ChatGoogleGenerativeAI` — structured output from Gemini in `analyze_opportunity` node |
| `lucide-react` | latest | Icon library for UI components |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | latest | Utility CSS framework |
| `@tailwindcss/postcss` | latest | PostCSS integration for Tailwind v4 |
| `postcss` | latest | CSS transformation pipeline |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOOGLE_API_KEY` | Gemini API access for `@langchain/google-genai` in `analyze_opportunity` node | Yes (for AI pipeline) |
| `GEMINI_MODEL` | Override Gemini model name; defaults to `gemini-2.5-flash` | No |
| `ATTOMDATA_API_KEY` | AttomData property enrichment API; skipped if unset | No (degrades gracefully) |
| `OPENROUTER_API_KEY` | LLM for `/api/feasibility` (preferred over OpenAI); alias: `ZONING_CONSULTANT_API_KEY` | Yes (for feasibility chat) |
| `OPENROUTER_MODEL` | OpenRouter model override; defaults to `openrouter/free` | No |
| `OPENROUTER_SITE_URL` | Canonical site URL sent to OpenRouter headers | No |
| `OPENROUTER_APP_TITLE` | App name in OpenRouter headers; defaults to `BricksNexus` | No |
| `OPENAI_API_KEY` | Direct OpenAI fallback if OpenRouter key is absent | No |
| `OPENAI_MODEL` | OpenAI model override; defaults to `gpt-4o` | No |
| `MAPBOX_ACCESS_TOKEN` | Premium geocoding (Mapbox); falls back to Census → Nominatim if unset | No |
| `GOOGLE_MAPS_GEOCODING_API_KEY` | Alternative premium geocoder | No |
| `NYC_GEOCLIENT_APP_ID` | NYC Geoclient API ID (NYC-only connector) | No |
| `NYC_GEOCLIENT_APP_KEY` | NYC Geoclient API key | No |
| `NYC_PLUTO_SODA_DATASET_ID` | Socrata dataset resource ID for NYC PLUTO open data | No |
| `NYC_SODA_APP_TOKEN` | Optional Socrata app token for higher rate limits | No |
| `BOSTON_PROPERTY_ASSESSMENT_RESOURCE_ID` | Boston CKAN datastore resource ID for property assessment | No |
| `OSM_OVERPASS_URL` | Override Overpass API URL; defaults to `https://overpass-api.de/api/interpreter` | No |
| `DISABLE_NOMINATIM_GEOCODE` | Set to `1` to disable OSM Nominatim geocoder fallback | No |
| `NOMINATIM_USER_AGENT` | User-Agent string for Nominatim requests (required by OSM policy) | No |
| `REGRID_API_KEY` | Regrid parcel data API (referenced in `.env.example`, not yet wired) | No |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used by `lib/llm-chat.js` for OpenRouter referer) | No |
| `VERCEL_URL` | Auto-set by Vercel; used as OpenRouter referer fallback | No |

Secrets stored in `.env.local` (never committed). Template at `.env.example`.
