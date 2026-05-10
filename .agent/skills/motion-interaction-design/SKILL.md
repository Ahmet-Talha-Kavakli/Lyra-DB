---
name: motion-interaction-design
description: Design and implement micro-animations, motion design, and interaction feedback for UI elements. Use this skill whenever adding animations to components, designing hover/click/transition effects, implementing page transitions, creating spring-based physics animations, designing loading states, building gesture-driven interactions (drag, swipe, pinch), or when the user mentions animasyon, geçiş efekti, sayfa çevirme, etkileşim, hareket, micro-interaction, or any mention of making UI elements feel "alive" or "tactile". Apply proactively for any interactive UI component that needs to feel premium and responsive.
---

# Motion & Interaction Design

## Overview

Motion design transforms static interfaces into living, breathing experiences. In the AI therapy context, animations must feel **calm, warm, and reassuring** — never jarring, frantic, or distracting. Every motion should have purpose: guiding attention, confirming actions, or providing emotional comfort.

## Core Motion Principles

### 1. The 4 Laws of Therapeutic Motion
| Law | Rule |
|-----|------|
| **Purposeful** | Every animation communicates something — state change, progress, success |
| **Calm** | Use gentle easing curves, never abrupt stops |
| **Consistent** | Same action = same motion across the entire app |
| **Accessible** | Always provide `prefers-reduced-motion` fallback |

### 2. Duration Guidelines
```
Micro (feedback):     100–200ms   → Button press, toggle, checkbox
Short (transition):   200–350ms   → Modal open, card flip, menu
Medium (flow):        350–500ms   → Page transition, panel slide
Long (narrative):     500–800ms   → Book open, onboarding reveal
Never exceed:         1000ms      → Users feel it's "broken" beyond this
```

### 3. Easing Vocabulary
```css
/* Use these named easings — never use linear for UI */
--ease-out-soft:    cubic-bezier(0.0, 0.0, 0.2, 1);   /* Standard decelerate */
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1); /* Gentle overshoot */
--ease-in-out-soft: cubic-bezier(0.4, 0.0, 0.2, 1);   /* Smooth both ends */
--ease-anticipate:  cubic-bezier(0.38, -0.4, 0.88, 0.65); /* Pull back then launch */
```

## Framer Motion — Primary Tool

**Always use Framer Motion** for React-based animations in this project.

### Essential Patterns

#### 1. Presence Animation (Mount/Unmount)
```tsx
import { AnimatePresence, motion } from 'framer-motion';

// ✅ Correct — AnimatePresence wraps conditional renders
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

#### 2. Spring Physics for Tactile Feel
```tsx
// ✅ Use spring for physical objects (books, cards, drawers)
<motion.div
  whileHover={{ scale: 1.04, y: -6 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
/>
```

#### 3. Gesture-Driven Interactions
```tsx
// ✅ Drag with constraints (book off shelf)
<motion.div
  drag
  dragConstraints={shelfRef}
  dragElastic={0.2}
  onDragEnd={(_, info) => handleDropOnDesk(info)}
  whileDrag={{ scale: 1.05, rotate: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
/>
```

#### 4. Staggered List Animations
```tsx
// ✅ Books appearing on shelf with stagger
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};
const item = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200 } }
};

<motion.div variants={container} initial="hidden" animate="show">
  {books.map(book => (
    <motion.div key={book.id} variants={item}>
      <Book {...book} />
    </motion.div>
  ))}
</motion.div>
```

## CSS 3D Transforms — For Page/Cover Flips

Use CSS 3D for book cover and page flip effects (better performance than JS-driven):

```css
.book-wrapper {
  perspective: 1200px;
}

.book-cover {
  transform-style: preserve-3d;
  transform-origin: left center;
  transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  backface-visibility: hidden;
}

.book-cover.open {
  transform: rotateY(-160deg);
}

/* Page flip */
.page {
  transform-style: preserve-3d;
  transform-origin: left center;
  backface-visibility: hidden;
}

.page.flipped {
  transform: rotateY(-180deg);
  transition: transform 600ms cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

## Interaction Recipe Library

### Book Hover (Peek from Shelf)
```tsx
<motion.div
  className="book-spine"
  initial={{ y: 0 }}
  whileHover={{ y: -18, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
>
  <BookSpine title="..." />
</motion.div>
```

### Success Celebration (Book Completed)
```tsx
// Subtle scale pulse + glow — not distracting
<motion.div
  animate={{
    scale: [1, 1.05, 1],
    boxShadow: ['0 0 0px gold', '0 0 24px gold', '0 0 0px gold']
  }}
  transition={{ duration: 0.8, ease: 'easeInOut' }}
/>
```

### Loading / Thinking State
```tsx
// Gentle floating animation for AI thinking
<motion.div
  animate={{ y: [-4, 4, -4] }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
/>
```

### Page Transition (Route Change)
```tsx
// Soft fade + slide for page navigation
const pageVariants = {
  initial:  { opacity: 0, x: 30 },
  animate:  { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.0, 0.0, 0.2, 1] } },
  exit:     { opacity: 0, x: -20, transition: { duration: 0.25 } }
};
```

## Performance Rules

- **Always use `will-change: transform`** on elements that animate frequently
- **Prefer `transform` and `opacity`** — they don't trigger layout reflow
- **Never animate**: `width`, `height`, `top`, `left`, `margin`, `padding` (use `transform: scale/translate` instead)
- **Use `layoutId`** in Framer Motion for shared element transitions (e.g., book moving from shelf to desk)
- Test on low-end devices — if animation drops below 60fps, simplify

```tsx
// ✅ GPU-accelerated (good)
transform: translateY(-20px) scale(1.05)

// ❌ Layout-triggering (bad — causes jank)
top: -20px; width: 110%;
```

## Accessibility — Non-Negotiable

```tsx
// Always check reduced motion preference
import { useReducedMotion } from 'framer-motion';

const BookComponent = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -18, scale: 1.03 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring' }}
    />
  );
};
```

## Motion Design Tokens

Define all motion values as CSS/JS tokens for consistency:

```ts
// lib/motion-tokens.ts
export const motionTokens = {
  duration: {
    micro:   0.15,
    short:   0.25,
    medium:  0.4,
    long:    0.6,
  },
  spring: {
    soft:    { type: 'spring', stiffness: 200, damping: 30 },
    snappy:  { type: 'spring', stiffness: 400, damping: 25 },
    bouncy:  { type: 'spring', stiffness: 300, damping: 15 },
  },
  easing: {
    decelerate: [0.0, 0.0, 0.2, 1] as const,
    standard:   [0.4, 0.0, 0.2, 1] as const,
    spring:     [0.34, 1.56, 0.64, 1] as const,
  }
};
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|-------------------|
| `animation: bounce 0.3s infinite` on UI | Use once-triggered spring, not loops |
| Custom animation for every component | Use shared `motionTokens` |
| `setTimeout` to manage animation state | Use `AnimatePresence` + `onAnimationComplete` |
| Animating 10+ elements simultaneously | Stagger with `staggerChildren` |
| No exit animation | Always define `exit` in `AnimatePresence` |
| `transition: all 0.3s` | Specify exact properties |

## References

See [references/framer-recipes.md](references/framer-recipes.md) for advanced Framer Motion patterns.
See [references/css3d-flip.md](references/css3d-flip.md) for pure CSS page flip implementation.
