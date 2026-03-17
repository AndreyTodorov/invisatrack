# InvisaTrack Rebrand Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app to "InvisaTrack" and replace the placeholder icon with a custom tooth + aligner SVG icon.

**Architecture:** Three independent batches — (1) text renames across source files, (2) new favicon SVG, (3) PNG rasterization of the SVG for PWA icons via a one-off `sharp` script.

**Tech Stack:** Vite + React + TypeScript, vite-plugin-pwa, sharp (for PNG generation), tsx (for running the generation script)

---

## Files Modified / Created

| File | Change |
| --- | --- |
| `index.html` | Update `<title>` |
| `package.json` | Update `name` field |
| `vite.config.ts` | Update PWA manifest `name` and `short_name` |
| `src/views/HomeView.tsx` | Update `<h1>` heading |
| `src/views/LoginView.tsx` | Update `<h1>` heading and `<p>` subtitle |
| `src/services/notifications.ts` | Update OS notification title |
| `README.md` | Update H1 and description |
| `public/favicon.svg` | Replace with new tooth + aligner SVG |
| `public/icon-192.png` | Replace with PNG export of favicon.svg at 192×192 |
| `public/icon-512.png` | Replace with PNG export of favicon.svg at 512×512 |
| `scripts/generate-icons.ts` | New one-off script to rasterize SVG → PNG via sharp |

---

## Task 1: Rename app text across all source files

**Files:**

- Modify: `index.html`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/views/HomeView.tsx`
- Modify: `src/views/LoginView.tsx`
- Modify: `src/services/notifications.ts`
- Modify: `README.md`

- [ ] **Step 1: Verify current test suite passes before making any changes**

```bash
npm test
```

Expected: all tests pass (establish a clean baseline).

- [ ] **Step 2: Update `index.html` title**

Find:
```html
<title>myapp</title>
```

Replace with:
```html
<title>InvisaTrack</title>
```

- [ ] **Step 3: Update `package.json` name**

Find:
```json
"name": "myapp",
```

Replace with:
```json
"name": "invisatrack",
```

- [ ] **Step 4: Update PWA manifest in `vite.config.ts`**

Find:
```ts
name: 'Invisalign Tracker',
short_name: 'AlignerTrack',
```

Replace with:
```ts
name: 'InvisaTrack',
short_name: 'InvisaTrack',
```

- [ ] **Step 5: Update heading in `src/views/HomeView.tsx`**

Find (around line 92):
```tsx
          AlignerTrack
```

Replace with:
```tsx
          InvisaTrack
```

- [ ] **Step 6: Update heading and subtitle in `src/views/LoginView.tsx`**

Find (around line 26):
```tsx
          AlignerTrack
```

Replace with:
```tsx
          InvisaTrack
```

Then find (around line 29):
```tsx
          Track your Invisalign wear time
```

Replace with:
```tsx
          Track your aligner wear time
```

- [ ] **Step 7: Update notification title in `src/services/notifications.ts`**

Find (around line 14):
```ts
    new Notification('AlignerTrack Reminder', {
```

Replace with:
```ts
    new Notification('InvisaTrack Reminder', {
```

- [ ] **Step 8: Update `README.md`**

Find line 1:
```markdown
# AlignerTrack
```

Replace with:
```markdown
# InvisaTrack
```

Then find in line 3:
```
tracking Invisalign aligner wear time
```

Replace with:
```
tracking aligner wear time
```

- [ ] **Step 9: Verify no remaining "AlignerTrack" or "Invisalign" in user-visible source files**

```bash
grep -r "AlignerTrack\|Invisalign" src/ index.html README.md vite.config.ts package.json
```

Expected: no output (zero matches).

- [ ] **Step 10: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add index.html package.json vite.config.ts src/views/HomeView.tsx src/views/LoginView.tsx src/services/notifications.ts README.md
git commit -m "feat: rename app to InvisaTrack across all source files"
```

---

## Task 2: Replace favicon with custom tooth + aligner SVG

**Files:**

- Modify: `public/favicon.svg`

- [ ] **Step 1: Replace `public/favicon.svg` with the new icon**

Overwrite the file with this content exactly:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <!-- Left root -->
  <rect x="16" y="34" width="12" height="18" rx="5" fill="#E6F0FF" stroke="#0066CC" stroke-width="2"/>
  <!-- Right root -->
  <rect x="36" y="34" width="12" height="18" rx="5" fill="#E6F0FF" stroke="#0066CC" stroke-width="2"/>
  <!-- Crown -->
  <rect x="10" y="14" width="44" height="26" rx="10" fill="#E6F0FF" stroke="#0066CC" stroke-width="2"/>
  <!-- Aligner arc (U-shape over crown, suggesting a clear tray) -->
  <path d="M6 22 Q6 4 32 4 Q58 4 58 22"
        stroke="#0066CC" stroke-width="3" stroke-linecap="round"
        fill="#0066CC" fill-opacity="0.10"/>
</svg>
```

- [ ] **Step 2: Verify the SVG renders correctly in a browser**

Open the dev server:

```bash
npm run dev
```

Navigate to `http://localhost:5173/invisalign/` and check that:

- The browser tab shows the new tooth+aligner icon (not the old purple lightning bolt)
- The icon looks recognizable at small (favicon) size

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg
git commit -m "feat: add custom tooth + aligner SVG favicon for InvisaTrack"
```

---

## Task 3: Generate PWA PNG icons from SVG

**Files:**

- Create: `scripts/generate-icons.ts`
- Modify: `public/icon-192.png`
- Modify: `public/icon-512.png`

- [ ] **Step 1: Install sharp and tsx as dev dependencies**

```bash
npm install --save-dev sharp tsx @types/node
```

`sharp` handles SVG→PNG rasterization. `tsx` runs the TypeScript script without a separate compile step. `@types/node` provides `fs` and `path` types (may already be installed — harmless if so).

- [ ] **Step 2: Create `scripts/generate-icons.ts`**

```typescript
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

const svgBuffer = readFileSync(join(process.cwd(), 'public', 'favicon.svg'))

async function main() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(process.cwd(), 'public', 'icon-192.png'))

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(process.cwd(), 'public', 'icon-512.png'))

  console.log('✓ icon-192.png generated')
  console.log('✓ icon-512.png generated')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the script to generate the PNGs**

```bash
npx tsx scripts/generate-icons.ts
```

Expected output:
```
✓ icon-192.png generated
✓ icon-512.png generated
```

If you get a sharp installation error on Apple Silicon, run:
```bash
npm rebuild sharp
```
then retry.

- [ ] **Step 4: Verify the generated PNGs**

Open `public/icon-192.png` and `public/icon-512.png` in any image viewer or browser. Confirm:

- They show the tooth + aligner icon (not the old purple lightning bolt)
- They are 192×192 and 512×512 pixels respectively
- The background is white (sharp rasterizes SVG transparent backgrounds to white by default — this is fine for PWA icons)

- [ ] **Step 5: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add public/icon-192.png public/icon-512.png scripts/generate-icons.ts package.json package-lock.json
git commit -m "feat: generate PWA icons from InvisaTrack SVG favicon"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `grep -r "AlignerTrack\|Invisalign" src/ index.html README.md vite.config.ts package.json` → no output
- [ ] Browser tab shows tooth+aligner icon
- [ ] PWA manifest shows `name: InvisaTrack` (check DevTools → Application → Manifest)
- [ ] `npm test` passes
- [ ] `npm run build` completes without errors
