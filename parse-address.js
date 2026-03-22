/**
 * Best-effort city / region extraction from a free-form US-style address string.
 * Replace with a geocoder (Mapbox, Google Places, etc.) in production.
 */
export function parseAddressParts(addressText) {
  const raw = String(addressText || "").trim();
  if (!raw) {
    return { city: "", region: "", streetLine: "" };
  }

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let region = "";
  let city = "";
  let streetLine = raw;

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const regionMatch = last.match(/\b([A-Za-z]{2})\b/);
    region = regionMatch ? regionMatch[1].toUpperCase() : "";

    if (parts.length >= 3) {
      city = parts[parts.length - 2];
      streetLine = parts.slice(0, -2).join(", ");
    } else {
      city = parts[0];
      streetLine = parts[0];
    }
  }

  city = city ? city.replace(/\s*[\d-].*$/, "").trim() : "";

  return { city, region, streetLine };
}
