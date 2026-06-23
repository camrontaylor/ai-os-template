export interface Client {
  slug: string;
  name: string;
  path: string;
  color: string;
}

// Neutral gray ramp: clients stay distinguishable without colour. Mid-grays
// read on both light and dark backgrounds (these are small identity dots).
const PALETTE = [
  "oklch(0.30 0 0)",
  "oklch(0.38 0 0)",
  "oklch(0.46 0 0)",
  "oklch(0.54 0 0)",
  "oklch(0.62 0 0)",
  "oklch(0.50 0 0)",
  "oklch(0.42 0 0)",
  "oklch(0.58 0 0)",
];

/**
 * Deterministic color assignment based on slug hash.
 * Simple string hash (djb2) mod palette length.
 */
export function getClientColor(slug: string): string {
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 33) ^ slug.charCodeAt(i);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

/**
 * Derive a display name from a slug: split on hyphens, capitalize each word.
 */
export function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
