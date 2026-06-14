# COMPONENTS.md — UI Component Map

> Maintained by AI. Update whenever a component is added, removed, or its props change.
> Read this before building any new UI — check if a component already exists.

---

## Site Shell

### `SiteChrome` — [`components/site/SiteChrome.jsx`](components/site/SiteChrome.jsx)
Global nav bar and page wrapper.

**Props:** `{ children }`

**Used in:** `app/layout.jsx` (wraps every page)

**Nav links:** Home, About, Homeowner Feasibility, Opportunity Report

**Update this file when:** adding a new page that should appear in nav.

---

## Property / Opportunity Report

### `ReportCard` — [`components/property/ReportCard.jsx`](components/property/ReportCard.jsx)
Two-column property information card.

**Props:**
```js
{
  ownerName: string,
  validatedAddress: string,
  blockLot: string,
  zoningDistrict: string,
  useAndOccupancy: string,
  assessedValue: number,
  buildingClass: string,
  numFloors: number,
  unitsTotal: number,
  lotArea: number,
  grossSqFt: number,
  yearBuilt: number
}
```

**Used in:** `app/opportunity-report/page.jsx`

**Left column:** Owner Info (name, address, block/lot, assessed value)
**Right column:** Land/Building Info (zoning, use, class, floors, units, lot area, sq ft, year built)

---

### `OpportunityAssessment` — [`components/property/OpportunityAssessment.jsx`](components/property/OpportunityAssessment.jsx)
Displays structured AI opportunity analysis output.

**Props:**
```js
{
  zoningAnalysis: string,         // from LangGraph node 2
  opportunityAssessment: string,  // from LangGraph node 3 — 2-3 paragraphs
  onPublish: () => void           // "Publish to Marketplace" button handler
}
```

**Used in:** `app/opportunity-report/page.jsx`

**Contains:** "Publish to Marketplace" button — triggers `onPublish` prop.

---

## Homeowner Feasibility

### `FeasibilityChat` — [`components/homeowner-feasibility/FeasibilityChat.jsx`](components/homeowner-feasibility/FeasibilityChat.jsx)
AI chat interface for homeowner feasibility questions.

**Props:** none (self-contained, manages own state)

**Used in:** `app/homeowner-feasibility/page.jsx`

**Calls:** `POST /api/feasibility`

---

## Tokenization

### `FundingProgressBar` — [`components/tokenization/FundingProgressBar.jsx`](components/tokenization/FundingProgressBar.jsx)
Visual progress bar showing funding completion.

**Props:** `{ raised: number, goal: number }`

**Used in:** `app/tokenization/page.jsx`

---

### `InvestmentCalculator` — [`components/tokenization/InvestmentCalculator.jsx`](components/tokenization/InvestmentCalculator.jsx)
Interactive calculator for projected investment returns.

**Props:** `{ pricePerToken: number, projectedReturn: number }`

**Used in:** `app/tokenization/page.jsx`

---

### `PropertyGallery` — [`components/tokenization/PropertyGallery.jsx`](components/tokenization/PropertyGallery.jsx)
Image gallery for a tokenized property.

**Props:** `{ images: string[] }`

**Used in:** `app/tokenization/page.jsx`

---

### `TokenDetailTabs` — [`components/tokenization/TokenDetailTabs.jsx`](components/tokenization/TokenDetailTabs.jsx)
Tabbed view: Overview / Financials / Documents / Legal.

**Props:** `{ tokenData: object }` — shape from `lib/token-data.js`

**Used in:** `app/tokenization/page.jsx`

---

### `TokenizationOpportunityForm` — [`components/tokenization/TokenizationOpportunityForm.jsx`](components/tokenization/TokenizationOpportunityForm.jsx)
Multi-step form for submitting a property for tokenization.

**Props:** `{ onSubmit: (data) => void }`

**Used in:** `app/tokenization/page.jsx`

---

### `TokenizationPreviewCard` — [`components/tokenization/TokenizationPreviewCard.jsx`](components/tokenization/TokenizationPreviewCard.jsx)
Preview card shown before publishing a token offering.

**Props:** `{ tokenData: object }`

**Used in:** `app/tokenization/page.jsx`

---

### `TokenPurchaseWidget` — [`components/tokenization/TokenPurchaseWidget.jsx`](components/tokenization/TokenPurchaseWidget.jsx)
Widget for purchasing tokens — quantity selector + buy button.

**Props:** `{ pricePerToken: number, availableTokens: number, onBuy: (qty) => void }`

**Used in:** `app/tokenization/page.jsx`

---

## Phase 3 Components (not yet built)

### `OpportunityCard` — `components/property/OpportunityCard.jsx` (Phase 3)
Marketplace listing card.

**Planned props:** `{ address, summary, zoningClass, reportUrl }`

**Will be used in:** `app/marketplace/page.jsx`

---

## Design System

- **Styling:** Tailwind CSS utility classes only — no custom CSS except `app/globals.css` and `app/about/about.css`
- **Icons:** `lucide-react` — import individual icons, do not import the whole package
- **Forms:** `react-hook-form` for any form with validation
- **No external component library** — build from scratch with Tailwind

## Layout Conventions

- Page container: `max-w-4xl mx-auto px-4 py-8` (standard)
- Section heading: `text-2xl font-bold mb-4`
- Card: `bg-white rounded-lg shadow p-6`
- Two-column grid: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Primary button: `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700`
