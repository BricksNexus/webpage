# BricksNexus — CLAUDE.md

## Project
Next.js app (App Router, JSX not TSX). Real estate/construction marketplace + AI feasibility assistant.
Stack: Next.js latest, React, Tailwind CSS, `react-hook-form`, `lucide-react`. No TypeScript — plain JS/JSX.

## Structure
```
app/           # Next.js App Router pages + API routes
components/    # Shared UI components (site/, homeowner-feasibility/, tokenization/)
lib/           # Utilities (api-cors.js, llm-chat.js, token-data.js, open-property/)
scripts/       # Node CLI scripts (fetch-zoning-by-address.mjs, etc.)
public/        # Static assets
*.jsx          # Loose component files at root (legacy — prefer app/ or components/)
*.mjs          # Standalone Node scripts (geocode, zoning, census, OSM)
```

## Dev Commands
```bash
npm run dev          # local dev server
npm run build        # production build — run after multi-file changes
node scripts/fetch-zoning-by-address.mjs  # zoning CLI
```

## Rules
- JSX, not TSX. No TypeScript. Keep it that way.
- Run `npm run build` after multi-file changes before reporting done.
- API routes live in `app/api/`. Use `lib/api-cors.js` for CORS headers.
- LLM calls go through `lib/llm-chat.js` (OpenRouter-compatible).
- Secrets in `.env.local` — never commit.
- New UI goes in `components/` under the relevant subdirectory, not root-level `.jsx` files.
- Git: commit frequently, prefer named files over `git add -A`.
you have accses t 
# AttomData and Gemmni API in the API docs

API DOCS: https://api.developer.attomdata.com/docs


You also have accses to  

https://github.com/langchain-ai/deepagents I want you to use this as well

