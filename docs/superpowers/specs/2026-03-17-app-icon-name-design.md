# App Icon & Name — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Goal

Rebrand the app from the placeholder name ("myapp" / "AlignerTrack") to **InvisaTrack** and replace the default favicon with a custom, trademark-safe SVG icon inspired by Invisalign's visual identity.

The app is public-facing, so the icon must be fully original and all visible text must avoid referencing the Invisalign trademark.

---

## Name Changes

| File | Field / Location | Old Value | New Value |
| --- | --- | --- | --- |
| `index.html` | `<title>` | `myapp` | `InvisaTrack` |
| `package.json` | `name` | `myapp` | `invisatrack` |
| `vite.config.ts` | PWA `name` | `Invisalign Tracker` | `InvisaTrack` |
| `vite.config.ts` | PWA `short_name` | `AlignerTrack` | `InvisaTrack` |
| `src/views/HomeView.tsx` | `<h1>` page heading (line ~92) | `AlignerTrack` | `InvisaTrack` |
| `src/views/LoginView.tsx` | `<h1>` login heading (line ~26) | `AlignerTrack` | `InvisaTrack` |
| `src/views/LoginView.tsx` | `<p>` subtitle (line ~29) | `Track your Invisalign wear time` | `Track your aligner wear time` |
| `src/services/notifications.ts` | OS notification title (line ~14) | `AlignerTrack Reminder` | `InvisaTrack Reminder` |
| `README.md` | H1 title (line 1) | `AlignerTrack` | `InvisaTrack` |
| `README.md` | Description (line 3) | `tracking Invisalign aligner wear time` | `tracking aligner wear time` |

### Out of scope

`src/services/db.ts` — the IndexedDB database is named `AlignerTrackDB`. Renaming it requires a Dexie migration to avoid data loss for existing users. This is a separate, non-trivial task and is explicitly excluded from this rebrand.

---

## Icon Design

**Concept:** Tooth + Aligner overlay — a stylized molar with a U-shaped aligner arc overlaid on the crown.

**Palette:**

- Primary blue: `#0066CC`
- Light blue: `#E6F0FF` (tooth fill)
- White: `#FFFFFF`

**Structure (SVG):**

- ViewBox: `0 0 64 64`, rounded-square composition
- **Tooth body**: Simplified molar — rounded rectangular crown, two short roots at the bottom. Fill: `#E6F0FF`, stroke: `#0066CC`, stroke-width ~2px.
- **Aligner arc**: A U-shaped open arc sitting over the top of the tooth crown. Stroke: `#0066CC`, stroke-width ~3px, very light semi-transparent fill (`#0066CC` at ~15% opacity) to suggest a transparent aligner tray.
- Transparent background so the icon works on any surface.

**Files to update:**

| File | Action |
| --- | --- |
| `public/favicon.svg` | Replace with new hand-coded SVG |
| `public/icon-192.png` | Replace with PNG export of the SVG at 192×192 |
| `public/icon-512.png` | Replace with PNG export of the SVG at 512×512 |
| `index.html` | No path change needed — already references `/favicon.svg` |

**PNG generation strategy:** Use the `sharp` npm package (dev dependency) to rasterize the SVG to PNG at the required sizes. First, install it: `npm install --save-dev sharp`. A one-off script (`scripts/generate-icons.ts`) will be added to run this. This avoids shipping SVG bytes as `.png` files, which causes MIME type mismatches and breaks PWA installation in Chrome.

Alternatively, the PWA manifest in `vite.config.ts` can be updated to declare an SVG icon entry with `type: 'image/svg+xml'` and `sizes: 'any'`, in addition to the two PNGs. This is a fallback if PNG generation is not set up.

---

## Out of Scope

- No changes to routing, Firebase config, or app logic
- No changes to theme color (`#6366f1` in the PWA manifest)
- No changes to the `base` URL (`/invisalign/`)
- No DB migration (see `AlignerTrackDB` note above)
- `src/utils/deviceId.ts` — the localStorage key `alignertrack_device_id` identifies the device for sync deduplication. Renaming it causes existing users to be assigned a new device ID, potentially creating duplicate sync entries. This is excluded from this rebrand.
