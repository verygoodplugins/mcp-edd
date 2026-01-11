# Brand Assets for Desktop Extension

This directory contains visual assets for the Claude Desktop Extension.

## Required Icons

Create VGP-branded icons with orange (#F97316) accent:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 128x128 | Primary icon |
| `icon-16.png` | 16x16 | Small UI elements |
| `icon-32.png` | 32x32 | Medium UI elements |
| `icon-64.png` | 64x64 | Large UI elements |

**Design guidelines:**
- Use transparent background
- VGP orange (#F97316) as primary color
- Simple design that scales well to small sizes
- Consider EDD shopping cart or download icon theme

## Screenshots

Place in `screenshots/` directory:

| File | Description |
|------|-------------|
| `sales-query.png` | Claude conversation querying sales data |
| `customer-lookup.png` | Customer information retrieval example |

**Screenshot guidelines:**
- 1280x800 or similar aspect ratio
- Show Claude Desktop UI
- Demonstrate real tool usage
- Blur any sensitive data

## Generating Icons

Quick generation with ImageMagick (if VGP logo exists):

```bash
# From a source logo
convert logo.png -resize 128x128 icon.png
convert logo.png -resize 64x64 icon-64.png
convert logo.png -resize 32x32 icon-32.png
convert logo.png -resize 16x16 icon-16.png
```

Or create manually in Figma/Sketch using VGP brand guidelines.
