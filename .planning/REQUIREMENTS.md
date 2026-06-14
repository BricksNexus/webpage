# BricksNexus Property Intelligence — Requirements

**Project:** BricksNexus Property Intelligence
**Milestone:** Property Analysis + Marketplace (v1)
**Date:** 2026-06-14

---

## v1 Requirements

### Property Data Enrichment

- [ ] **PROP-01**: User can submit a street address via a web form and trigger property analysis
- [ ] **PROP-02**: System retrieves owner name from AttomData by address
- [ ] **PROP-03**: System retrieves block and lot number from AttomData by address
- [ ] **PROP-04**: System validates and normalizes the input address (Census geocoder)
- [ ] **PROP-05**: System retrieves zoning classification and buildable area from city data (NYC PLUTO or equivalent)
- [ ] **PROP-06**: System retrieves use & occupancy data from AttomData (property use code, occupancy status, assessed value)

### AI Analysis

- [ ] **PROP-07**: System generates a natural-language development opportunity assessment combining zoning and use/occupancy data via Gemini AI
- [ ] **PROP-10**: LangGraph orchestrates the multi-step data enrichment → AI analysis pipeline

### Report UI

- [ ] **PROP-08-A**: System displays a structured Property Opportunity Report with: owner name, validated address, block/lot, zoning info, use & occupancy, and AI opportunity assessment
- [ ] **PROP-08-B**: Report has a "Publish to Marketplace" button

### Marketplace

- [ ] **PROP-09-A**: Published opportunities are stored (JSON file for v1)
- [ ] **PROP-09-B**: Marketplace page (`/marketplace`) displays published opportunity cards with: address, AI summary excerpt, zoning class, and a "View Report" link
- [ ] **PROP-09-C**: Clicking a marketplace card shows the full Property Opportunity Report

---

## v2 Requirements (Deferred)

- User accounts / saved properties
- Contact form between marketplace visitors and property owners
- Map view of marketplace listings
- Multi-city support beyond NYC
- PDF export of opportunity report

---

## Out of Scope

- Payment / tokenization flows — existing features untouched
- Property images / media upload — not needed for v1
- Mobile app — web only
- User authentication — no login required for v1

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PROP-01 | Phase 1 | Pending |
| PROP-02 | Phase 1 | Pending |
| PROP-03 | Phase 1 | Pending |
| PROP-04 | Phase 1 | Pending |
| PROP-05 | Phase 1 | Pending |
| PROP-06 | Phase 1 | Pending |
| PROP-07 | Phase 2 | Pending |
| PROP-08-A | Phase 2 | Pending |
| PROP-08-B | Phase 2 | Pending |
| PROP-09-A | Phase 3 | Pending |
| PROP-09-B | Phase 3 | Pending |
| PROP-09-C | Phase 3 | Pending |
| PROP-10 | Phase 2 | Pending |
