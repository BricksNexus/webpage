# BricksNexus Website – Planning

## Overview

Static marketplace site that connects builders with opportunities (construction / real estate). No backend; behavior uses **localStorage** and **sessionStorage**.

---

## Structure

| Area | Files | Purpose |
|------|--------|---------|
| **Main** | `index.html`, `landing.html`, `marketplace.css` | Marketplace feed, top bar, sidebars, filters, map placeholder |
| **Auth** | `login.html`, `signup.html`, `auth.css` | Login/signup; sets `sessionStorage.bricksnexus_initials` for avatar |
| **Open to Work** | `open-to-work.html`, `open-to-work-portfolio.html`, `open-to-work.css` | Core details → Picture & Portfolio → Tokenization flow |
| **Post Opportunity** | `post-opportunity.html`, `post-opportunity.js`, `post-opportunity-chatbot.js`, `post-opportunity.css` | Form + map; saves to `localStorage.bricksnexus_opportunities`; chatbot for discovery |
| **Post Service** | `post-service.html`, `post-service.js`, `post-service.css` | Service form; saves to `localStorage.bricksnexus_services` |

---

## Key Behaviors

- **Feed**: Cards filtered by `data-category` (open-to-work, services, opportunities). First opportunity uses `images/land_infill.jpeg`; Open to Work and Service cards use avatars (`images/Marcus_GC.png`, `images/BuildRight_company.png`) at 80×80px.
- **Clear local data**: Index clears `bricksnexus_services`, `bricksnexus_service_drafts`, `bricksnexus_opportunities`, `bricksnexus_opportunity_drafts` and removes dynamic cards.
- **Drafts**: Opportunity and service drafts use `bricksnexus_opportunity_drafts` and `bricksnexus_service_drafts`.

---

## Possible Next Steps

- [ ] Add real backend / API for opportunities, services, and auth
- [ ] Replace map placeholder with live Google Maps integration
- [ ] Tokenization flow (Open to Work step 3)
- [ ] Profile pages and “View profile” / “Contact” actions
- [ ] Industry Intelligence content and behavior

---

## Notes

- Keep avatar and card assets under `images/`.
- Styling: `marketplace.css` for index/feed; form pages use their own CSS files.
- All “post” flows write to localStorage and redirect to index; index scripts inject cards from stored data.
