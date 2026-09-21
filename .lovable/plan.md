# Downloadable Rate Card

## What will be added

- Add a **Preview rate card** action to the admin Pricing page.
- Show a polished A4-style Smart Ushering rate card containing every current package, its description, included features, updated per-usher price, transport charge, and standard notes.
- Add clear zoom in, zoom out, reset, close, and download controls around the preview.
- Generate a branded PDF directly from the prices currently loaded from the database, so every newly opened preview and downloaded rate card reflects the latest saved updates.
- Keep price saving unchanged; after saving, refresh the pricing data before the next preview/download.

## Technical details

- Build a focused rate-card preview component and PDF generator using the existing `pdf-lib` dependency.
- Keep the feature within the existing admin Pricing page and current Smart Ushering navy/gold design.
- Verify the preview at desktop and mobile sizes, and inspect the generated PDF visually for clipping, overlap, and readable package pricing.
