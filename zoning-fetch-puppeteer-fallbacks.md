# Puppeteer / headless browser fallbacks (zoning & property UIs)

Direct APIs (Geoclient + PLUTO Socrata for NYC; CKAN assessing for Boston) are preferred: they are **stable**, **cacheable**, and easier to comply with terms of use.

When a portal has **no public API** or the data you need exists only behind a **map UI** or **session-heavy** app, a headless browser can be a **last resort**.

## General rules

- Read **Terms of Use**, **robots.txt**, and **rate limits**. Prefer official open-data APIs and bulk downloads.
- Run scrapers **slowly**, **log failures**, and **do not** hammer interactive map tiles unless you have permission.
- Prefer **ArcGIS REST** / **GeoJSON** / **Socrata** / **CKAN** if the agency exposes them (many do).

---

## New York City

### ZoLa (Zoning & land use map)

- **URL:** `https://zola.planning.nyc.gov/`
- **What it shows:** Zoning districts, overlays, FRESH, etc.
- **API situation:** There is no stable public REST API documented here as a substitute for the full ZoLa UI. PLUTO / MapPLUTO (NYC Open Data) often covers **zoning district** at the tax-lot level; use the script’s **Geoclient → BBL → PLUTO** path first.
- **Puppeteer strategy (if required):**
  1. Launch headless Chromium with a **fixed viewport** and **user agent**.
  2. Open ZoLa, wait for the map canvas / WebGL to initialize (use `networkidle` or explicit wait for a known DOM node).
  3. Use the site’s **search box** (if present) to enter normalized address from your geocoder; wait for **parcel highlight** or **sidebar** to populate.
  4. Parse **visible text** from the sidebar panel (not canvas pixels).
  5. **Risk:** UI changes break selectors; map apps often use WebGL—**prefer API data** (PLUTO + Geoclient) instead.

### Property Information Portal (PIP) / DOB building & occupancy context

- **Context:** Occupancy and building class for compliance often come from **DOB** systems (e.g. BIS / DOB NOW) rather than PLUTO alone.
- **Puppeteer strategy (if no API key):**
  1. Identify the **exact** portal URL your product targets (BIN/BBL search flows differ).
  2. Automate **search by BBL** (from NYC Geoclient) rather than free-text address when possible.
  3. Extract **CO / occupancy** and **building classification** fields from the **HTML** response table, not PDFs (PDF parsing is a separate pipeline).
  4. **Risk:** CAPTCHA, auth, and session cookies—plan for failure modes.

---

## Boston

### BPDA / zoning GIS

- **Context:** **Zoning** is often distributed as **GIS layers** (polygons). Assessing datasets may include partial fields but not a full legal zoning determination.
- **Preferred approach:** Discover an **ArcGIS FeatureServer** or **GeoJSON** endpoint on `boston.gov` / `bopla.org` / related open-data catalogs and run a **point-in-polygon** query using your geocoded coordinates.
- **Puppeteer strategy (if required):**
  1. Open the official **zoning map** web app.
  2. Inject or automate **search** for address; wait for **popup** with zoning district.
  3. Read popup text / attributes from the DOM.
  4. **Risk:** Same as NYC—WebGL maps and frequent UI updates.

### Assessing open data (CKAN)

- **Preferred:** `datastore_search` on the current **Property Assessment** resource (see `.env.example`). Good for **valuation / land use codes**; **zoning** may still need GIS.

---

## Implementation sketch (Puppeteer)

```bash
npm install puppeteer
```

```javascript
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://example-city-portal.gov/map", { waitUntil: "networkidle2" });
// await page.type('[data-testid="search"]', normalizedAddress);
// await page.waitForSelector(".parcel-details");
// const text = await page.$eval(".parcel-details", (el) => el.innerText);
await browser.close();
```

Add **retries**, **timeouts**, and **structured logging**. Do not commit credentials to the repo.
