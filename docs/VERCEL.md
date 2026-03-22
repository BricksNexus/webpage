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
   | `OPENROUTER_MODEL` | Optional; default `openai/gpt-4o` on OpenRouter |
   | `OPENROUTER_SITE_URL` or `NEXT_PUBLIC_SITE_URL` | Optional referer for OpenRouter |
   | `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_GEOCODING_API_KEY` | `/api/property` geocoding |
   | NYC / Boston keys | Optional city enrichers (see `.env.example`) |

6. **Deploy.** After the first deploy, `https://your-project.vercel.app/` redirects to the marketplace (`/index.html` in `public/`), and App Router routes (`/about`, `/tokenization`, `/homeowner-feasibility`, `/api/*`) work on the same origin.

## Notes

- **GitHub Pages** can still deploy static files from `public/` via the workflow; **Vercel** runs the full Next app + API routes.
- Do **not** commit `.env.local`; set secrets only in Vercel **Environment Variables**.
