#!/usr/bin/env node
/**
 * Fetch normalized address + open-source property hints for any city (worldwide OSM; US Census when US).
 * Optional NYC/Boston official layers when configured.
 *
 * Usage:
 *   node scripts/fetch-zoning-by-address.mjs "Avenida Paulista 1000, São Paulo, Brazil"
 *   node scripts/fetch-zoning-by-address.mjs "120 Broadway, New York, NY"
 *   node scripts/fetch-zoning-by-address.mjs "1 City Hall Plaza, Boston, MA" --city boston
 *
 * Env: .env.local (see .env.example)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

import { fetchPropertyIntel } from "../lib/open-property/fetch-property-intel.mjs";

function parseArgs(argv) {
  const args = argv.slice(2);
  let cityFlag = null;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--city" && args[i + 1]) {
      cityFlag = args[i + 1].toLowerCase();
      i++;
      continue;
    }
    positional.push(args[i]);
  }
  const address = positional.join(" ").trim();
  return { address, cityFlag };
}

async function main() {
  const { address, cityFlag } = parseArgs(process.argv);
  if (!address) {
    console.error(
      'Usage: node scripts/fetch-zoning-by-address.mjs "<address>" [--city nyc|boston]'
    );
    process.exit(1);
  }

  console.log("Fetching open-source property intel…");

  const metroOverride =
    cityFlag === "nyc" || cityFlag === "boston" || cityFlag === "generic"
      ? cityFlag
      : undefined;

  const out = await fetchPropertyIntel(address, { metroOverride });

  out.puppeteerFallbacks = {
    doc: "docs/zoning-fetch-puppeteer-fallbacks.md",
    note:
      "When a city has no machine-readable zoning API, use documented headless-browser strategies (respect ToS).",
  };

  console.log("\n--- Result (JSON) ---\n");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
