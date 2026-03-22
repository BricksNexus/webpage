# Homeowner feasibility (Next.js)

Helps homeowners explore **ADUs** and **additional units** using:

1. **`POST /api/property`** — Accepts `{ "address": "…", "metroOverride"?: "nyc" | "boston" | "generic" }`. Uses **Mapbox/Google geocoding**, then:
   - **Worldwide:** **OpenStreetMap (Overpass)** for building / landuse (and rare zoning) tags.
   - **United States:** **U.S. Census Geocoder** for incorporated place / county / state (jurisdiction, not zoning).
   - **Optional:** NYC (Geoclient + PLUTO) or Boston (CKAN assessing) when env keys and location match.
2. **`POST /api/feasibility`** — Sends address + property JSON + chat history to an LLM (**OpenRouter** by default when `OPENROUTER_API_KEY` is set; otherwise **OpenAI** if `OPENAI_API_KEY` is set) with a **Zoning Consultant** system prompt and an embedded **simplified Knowledge Base** (NYC/Boston patterns). Replies use three sections: **Current Status**, **Potential for Growth**, **Regulatory Hurdles** (see `lib/homeowner-feasibility/zoning-consultant-prompt.js`).

Core logic lives in **`lib/open-property/`** (see `lib/open-property/README.md`).

## Folder layout

```
app/
  api/
    property/route.js       # Delegates to fetchPropertyIntel
    feasibility/route.js    # OpenRouter / OpenAI chat completions
  homeowner-feasibility/
    page.jsx
components/
  homeowner-feasibility/
    FeasibilityChat.jsx
lib/
  open-property/            # Nationwide open-source stack + optional city hooks
  homeowner-feasibility/
    parse-address.js
    feasibility-prompt.js
```

## Run locally

```bash
cp .env.example .env.local
# MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_GEOCODING_API_KEY (required for /api/property)
# OPENROUTER_API_KEY (recommended for /api/feasibility on Vercel)
# Optional: OPENROUTER_MODEL=openrouter/free (default in app) or openai/gpt-4o if you use paid credits
npm install
npm run dev
```

Open: `http://localhost:3000/homeowner-feasibility`

## Vercel

Project → **Settings** → **Environment Variables**: add `OPENROUTER_API_KEY`. Optionally `OPENROUTER_SITE_URL` (production URL) and `OPENROUTER_MODEL`. Redeploy after changes.

## Legal

Outputs are **informational only**, not a zoning determination or legal advice. OSM and Census do not replace municipal zoning maps or certificates of occupancy.
