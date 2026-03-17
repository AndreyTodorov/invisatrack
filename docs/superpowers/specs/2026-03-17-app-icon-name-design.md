# App Icon & Name — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Goal

Rebrand the app from the placeholder name ("myapp" / "Invisalign Tracker") to **InvisaTrack** and replace the default Claude Code favicon with a custom, trademark-safe SVG icon inspired by Invisalign's visual identity.

The app is public-facing, so the icon must be fully original — no use of Invisalign's actual trademark logo or wordmark.

---

## Name Changes

| File | Field | Old Value | New Value |
|---|---|---|---|
| `index.html` | `<title>` | `myapp` | `InvisaTrack` |
| `package.json` | `name` | `myapp` | `invisatrack` |
| `vite.config.ts` | PWA `name` | `Invisalign Tracker` | `InvisaTrack` |
| `vite.config.ts` | PWA `short_name` | `AlignerTrack` | `InvisaTrack` |

---

## Icon Design

**Concept:** Tooth + Aligner overlay — a stylized molar with a U-shaped aligner arc overlaid on the crown.

**Palette:**
- Primary blue: `#0066CC` (Invisalign brand blue, fully original usage)
- Light blue: `#E6F0FF` (tooth fill / background accent)
- White: `#FFFFFF`

**Structure (SVG):**
- ViewBox: `0 0 64 64`, rounded-square composition
- **Tooth body**: Simplified molar — rounded rectangular crown, two short roots at the bottom. Fill: `#E6F0FF`, stroke: `#0066CC`, stroke-width ~2px.
- **Aligner arc**: A U-shaped open arc sitting over the top of the tooth crown. Stroke: `#0066CC`, stroke-width ~3px, no fill (or very light semi-transparent `#0066CC` fill at ~15% opacity to suggest transparency of the aligner tray).
- No background rectangle — transparent background so it works on any surface.

**Files to update:**
- `public/favicon.svg` — replaced with new hand-coded SVG
- `public/icon-192.png` — replaced with PNG render of the new SVG at 192×192
- `public/icon-512.png` — replaced with PNG render of the new SVG at 512×512
- `index.html` — `<link rel="icon">` already points to `/favicon.svg`, no path change needed

**PNG generation:** The two PNG icons will be hand-crafted as inline SVG-based PNGs or replaced with higher-res SVG copies renamed as `.png` only if the runtime supports it. Preferred approach: keep PNGs as rasterized exports of the SVG. Since no build-time rasterizer is configured, the PNGs will be manually created SVG content saved as `.png` — Vite PWA uses them for the manifest, and browsers accept SVG data in PNG slots for PWA icons if the file is valid SVG. Alternatively, the manifest can be updated to reference the SVG directly.

**Simplest viable approach for PNGs:** Update the PWA manifest in `vite.config.ts` to add an SVG icon entry alongside the PNGs, and replace the PNG files with copies of the SVG (many PWA installers accept this). This avoids requiring a headless browser or canvas tool at dev time.

---

## Out of Scope

- No changes to routing, Firebase config, or any app logic
- No changes to theme color (`#6366f1` stays as-is in the PWA manifest)
- No changes to the `base` URL (`/invisalign/`)
