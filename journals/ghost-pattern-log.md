# Ghost Pattern CSS Doodles — Implementation Log

**Date:** 2026-02-16
**Commit:** 351e79e

## What was built

### GhostPattern component (`app/src/components/GhostPattern.tsx`)
- Reusable `"use client"` component using [css-doodle](https://css-doodle.com/) web component
- Three variants:
  - `header` — 6x3 grid, floating ghost silhouettes (20-50px), 3-7% opacity, 18-30s float animation
  - `grid` — 8x6 grid, smaller ghosts (12-28px) with eye dots, 2-5% opacity, 22-35s drift
  - `footer` — 10x4 grid, mixed sizes (14-40px), 3-8% opacity, 20-32s rise animation
- Dynamic import with `ssr: false` to avoid Next.js hydration issues
- All ghosts use brand purple (#7c5cfc) with CSS border-radius for rounded-top/wavy-bottom shape

### Footer component (`app/src/components/Footer.tsx`)
- "GhostOdds © 2026 — Predict. Trade. No trace."
- Links: Markets, Portfolio, Admin
- "Built on Solana" badge with purple dot
- Ghost pattern footer variant as backdrop

### Integration points
| Location | File | Variant | Notes |
|----------|------|---------|-------|
| Navbar | `Navbar.tsx` | `header` | Extra `opacity-40` wrapper for subtlety |
| Homepage hero | `page.tsx` | `header` | Behind "Predict. Trade. No trace." |
| Market chart | `market/[id]/page.tsx` | `grid` | Behind the price chart card |
| Footer | `layout.tsx` | `footer` | Via Footer component |

### Technical details
- All patterns: `position: absolute`, `pointer-events: none`, `z-index: 0`
- TypeScript declarations in `src/types/css-doodle.d.ts` and `src/types/jsx.d.ts`
- No compile errors, dev server runs clean
