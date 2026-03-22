# Deploy on Vercel

The app is a **Next.js** project in this directory. Vercel detects it automatically.

## Steps

1. Push this repo to GitHub (if not already).
2. [Vercel](https://vercel.com) → **Add New Project** → import the repository.
3. **Root Directory:** leave default if this folder is the repo root; otherwise set it to the folder that contains `package.json`.
4. **Framework Preset:** Next.js (auto).
5. **Environment variables** (Production / Preview as needed):

   | Variable | Required for |
   |----------|----------------|
   | `OPENROUTER_API_KEY` | `/api/feasibility` (zoning consultant) |
   | `ZONING_CONSULTANT_API_KEY` | Same as above if you prefer that name (alias) |
   | `OPENROUTER_MODEL` | Optional; default **`openrouter/free`** (no credits). Use e.g. `openai/gpt-4o` if you buy credits |
   | `OPENROUTER_SITE_URL` or `NEXT_PUBLIC_SITE_URL` | Optional referer for OpenRouter |
   | `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_GEOCODING_API_KEY` | `/api/property` geocoding |
   | NYC / Boston keys | Optional city enrichers (see `.env.example`) |

6. **Deploy.** After the first deploy, `https://your-project.vercel.app/` redirects to the marketplace (`/index.html` in `public/`), and App Router routes (`/about`, `/tokenization`, `/homeowner-feasibility`, `/api/*`) work on the same origin.

## Notes

- **GitHub Pages** can still deploy static files from `public/` via the workflow; **Vercel** runs the full Next app + API routes.
- Do **not** commit `.env.local`; set secrets only in Vercel **Environment Variables**.

## OpenRouter returns an error (502 / “request failed”)

1. **Credits:** Paid models need balance — [openrouter.ai/credits](https://openrouter.ai/credits). This app defaults to **`openrouter/free`** ($0 router). If you set `OPENROUTER_MODEL` to a paid model, add credits or you’ll get `402`.
2. **Key value:** Paste **only** the key (`sk-or-v1-…`), not the word `Bearer`. Our code strips an accidental `Bearer ` prefix.
3. **Redeploy** after changing env vars.
4. The chat UI now shows **OpenRouter’s message** (e.g. 401 invalid key, 402 credits) when `/api/feasibility` fails.
