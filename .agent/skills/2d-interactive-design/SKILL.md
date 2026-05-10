---
name: 2d-interactive-design
description: Design and implement interactive 2D materials and objects — books, notebooks, bookshelves, cards, folders, and similar tactile UI elements. Use this skill whenever designing 2D illustrated assets, adding interactions to visual objects (open/close, flip, drag, hover states), creating a "reading room" or "library" interface, building animated book/document components, or when the user mentions kitaplık, defter, kitap, 2D materyal, interaktif obje, sayfa çevirme, or any illustrated therapeutic tool. Apply proactively for any therapy-app visual material that mimics real-world objects.
---

# 2D Interactive Design

## Overview

This skill governs the design and implementation of interactive 2D materials — tangible-feeling UI objects that users can interact with as if they were physical items. In the AI therapy context, these objects (books, notebooks, journals, workbooks) serve as therapeutic tools that feel warm, inviting, and safe.

## Core Design Principles

### 1. Skeuomorphic Warmth
- Give objects realistic proportions and subtle texture cues (paper grain, book spine shadow, notebook spirals)
- Use soft, warm color palettes — avoid sterile flat colors
- Shadows should be soft and layered (not harsh drop-shadows)
- Paper/material feel: use `box-shadow` + subtle `border-radius` variations for pages

### 2. Object States — Always Design All 5
Every interactive 2D object must have defined visual states:
| State | Description |
|-------|-------------|
| **Idle** | Default resting state, slight ambient animation |
| **Hover** | Object "lifts" toward user — subtle scale + shadow increase |
| **Active/Click** | Pressed state — slight scale-down, shadow collapses |
| **Open** | Expanded state — book open, notebook cover flipped |
| **Disabled** | Grayed/locked — with visual lock indicator if applicable |

### 3. Layer Architecture for 2D Objects
Use CSS layering for realistic depth:
```
[Shadow Layer]    — z-index: 0, blurred bottom shadow
[Back Cover]      — z-index: 1, slightly offset
[Pages Stack]     — z-index: 2-N, fanned or flat
[Front Cover]     — z-index: N+1, top surface
[Highlight Layer] — z-index: N+2, subtle sheen/gloss
```

### 4. Bookshelf Layout Rules
- Books on a shelf must have varied heights (±15% variation) for realism
- Spine widths should reflect content density (thicker = more content)
- Tilt 1-2 books slightly for organic feel
- Use a consistent baseline (shelf line) for grounding
- Include subtle shelf shadow/wood texture

## Implementation Stack (Recommended)

For Next.js / React-based projects:
| Need | Tool |
|------|------|
| 2D illustrations | SVG components (inline SVG in React) |
| Page-flip animation | CSS 3D transforms + `transform-style: preserve-3d` |
| Drag interactions | `react-use-gesture` or Framer Motion drag |
| Complex timelines | **Framer Motion** (`motion.div`, `AnimatePresence`) |
| SVG morphing | `GSAP` MorphSVG or CSS clip-path transitions |
| Canvas-based | `Konva.js` for complex interactive scenes |

**Prefer Framer Motion** for React — it handles spring physics, gesture detection, and AnimatePresence lifecycle cleanly.

## SVG Asset Guidelines

Always build 2D objects as SVG for:
- Infinite scalability (Retina / high-DPI screens)
- CSS/JS animation control on individual parts
- Accessibility (add `role`, `aria-label`, `title` to SVG)
- Small file size vs. PNG/JPEG

```tsx
// ✅ Correct — SVG as React component with animated parts
const BookCover = () => (
  <motion.svg viewBox="0 0 200 280" role="img" aria-label="Therapy journal">
    <motion.rect   // Cover
      className="book-cover"
      whileHover={{ rotateY: -15 }}
    />
    <motion.rect   // Pages
      className="book-pages"
    />
  </motion.svg>
);

// ❌ Wrong — Static PNG with no interaction hooks
<img src="/book.png" alt="book" />
```

## Interaction Design Patterns

### Book / Notebook Open
```
Closed → [click] → Cover rotates on Y-axis (CSS 3D) → Pages reveal → Open state
Duration: 400-600ms | Easing: spring(stiffness: 100, damping: 20)
```

### Page Flip
```
Page → [swipe/click] → Page curls from right → New page reveals
Use: CSS 3D rotateY(-180deg) with backface-visibility: hidden
```

### Shelf Hover (Book Peek)
```
Book on shelf → [hover] → Book slides UP by 15-20px → Title visible
Duration: 200ms | Easing: ease-out
```

### Drag to Pull Off Shelf
```
Book → [drag start] → Detach from shelf position → Follow cursor → 
[drop on desk area] → Open animation triggers
```

## Accessibility Requirements
- All interactive objects must be keyboard-navigable (`tabIndex`, `onKeyDown`)
- Use `aria-expanded` for open/closed book states
- Provide `prefers-reduced-motion` fallback (skip animations, use instant state change)
- Minimum touch target: 44×44px on mobile

```css
@media (prefers-reduced-motion: reduce) {
  .book-animation { animation: none; transition: none; }
}
```

## Color & Material Palette

### Warm Library Palette
```css
--book-cover-primary:    hsl(25, 60%, 35%);   /* Warm leather brown */
--book-cover-secondary:  hsl(200, 40%, 30%);  /* Teal-slate */
--book-pages:            hsl(45, 30%, 92%);   /* Aged paper */
--book-spine-shadow:     hsla(0, 0%, 0%, 0.2);
--shelf-wood:            hsl(30, 35%, 45%);   /* Warm walnut */
--notebook-cover:        hsl(150, 30%, 40%);  /* Sage green */
--notebook-spiral:       hsl(0, 0%, 60%);     /* Metallic silver */
```

## File Organization

```
components/
  library/
    BookshelfScene.tsx      — Full shelf layout
    Book.tsx                — Single interactive book
    Notebook.tsx            — Spiral notebook component
    PageFlip.tsx            — Page flip animation engine
    DeskArea.tsx            — Drop zone for opened items
  hooks/
    useBookInteraction.ts   — Shared gesture/state logic
  assets/
    books/                  — SVG book assets
    notebooks/              — SVG notebook assets
```

## Therapeutic Context Notes

- Books = **psychoeducation modules**, worksheets, therapy exercises
- Notebooks = **journaling tools**, mood trackers, homework assignments
- Bookshelf = **user's personal library** of completed and ongoing materials
- Opening a book should feel like a **meaningful, intentional act**
- Use micro-celebrations when a user completes a book (subtle confetti, glow)

## References

See [references/animation-recipes.md](references/animation-recipes.md) for copy-paste Framer Motion recipes.
See [references/svg-components.md](references/svg-components.md) for base SVG component templates.
