# Dashboard Redesign — Spec

**Date:** 2026-04-09
**Goal:** Replace the 3-card flat dashboard with a full sidebar + content-area layout, adding Journal, Mood Tracker, Breathing Exercises, and Goals pages.

---

## Architecture

```
apps/web/src/
  app/[locale]/(dashboard)/
    layout.tsx              ← replace top-nav with sidebar layout
    dashboard/page.tsx      ← home: greeting, streak, mood mini, quick CTA
    journal/page.tsx        ← NEW
    mood/page.tsx           ← NEW
    breathe/page.tsx        ← NEW
    goals/page.tsx          ← NEW
    history/page.tsx        ← keep, minor style polish
    profile/page.tsx        ← keep

  features/
    dashboard/components/
      sidebar.tsx           ← collapsible sidebar (240px → 64px)
      sidebar-nav-item.tsx  ← single nav item with icon + label
      home-greeting.tsx     ← time-aware greeting card
      streak-card.tsx       ← streak counter with flame animation
      mood-mini-chart.tsx   ← 7-dot inline chart

    journal/components/
      journal-view.tsx      ← full book/diary layout
      journal-entry-list.tsx← left page: past entries list
      journal-editor.tsx    ← right page: textarea with autosave

    mood/components/
      mood-checkin.tsx      ← emoji slider check-in
      mood-trend-chart.tsx  ← recharts LineChart (7d / 30d)
      mood-heatmap.tsx      ← contribution-graph style calendar

    breathe/components/
      breathing-exercise.tsx← animated circle + timer

    goals/components/
      goals-list.tsx        ← list goals from UserProfile.goals
      goal-item.tsx         ← single goal with progress bar

apps/api/src/modules/
  journal/                  ← NEW: controller + service
  mood/                     ← NEW: controller + service

apps/api/prisma/schema.prisma ← add JournalEntry + MoodLog models
```

---

## Tech Stack

| Concern | Library |
|---------|---------|
| Animations | framer-motion |
| Charts | recharts |
| Icons | lucide-react |
| Journal font | Google Fonts — Caveat (next/font/google) |
| State (sidebar collapse) | Zustand (already installed) |
| HTTP client | fetch (existing pattern) |

---

## Database Changes

```prisma
model JournalEntry {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  entryDate DateTime @map("entry_date") @db.Date
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, entryDate])
  @@map("journal_entries")
}

model MoodLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  score     Int      // 1–5
  loggedAt  DateTime @default(now()) @map("logged_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("mood_logs")
}
```

---

## API Endpoints

### Journal
- `GET  /journal?date=YYYY-MM-DD` → `{ id, entryDate, content }`
- `PUT  /journal` body: `{ date, content }` → upsert

### Mood
- `POST /mood` body: `{ score: 1-5 }` → create log
- `GET  /mood/history?days=7` → `[{ score, loggedAt }]`

---

## UI Details

### Sidebar
- Width: 240px expanded / 64px collapsed
- Toggle button at bottom
- Active item: violet left border + bg highlight
- User avatar + name at bottom (Clerk `useUser`)
- Framer Motion `animate={{ width }}` for collapse

### Dashboard Home
- `"İyi akşamlar, {name}"` — time-aware (sabah/öğle/akşam/gece)
- Streak card: flame icon, day count, "gün üst üste" label
- Quick mood row: 5 emoji buttons, clicking logs score + updates mini chart
- Last session card: date + summary snippet
- Big "Seans Başlat" button (links to /session)

### Journal
- Two-column layout (book metaphor)
- Left col: list of past entry dates (clickable)
- Right col: `<textarea>` with Caveat font, line-ruled background via CSS
- Page change: `AnimatePresence` + `x: 100 → 0` slide with slight rotation (3deg → 0deg)
- Auto-save: debounced 1000ms PUT to `/journal`
- Empty state: "Henüz bir şey yazmadın — bugün nasıl geçti?"

### Mood Tracker
- Top: today's check-in (if not logged yet — pulsing prompt)
- 5 emoji buttons: 😢 😕 😐 🙂 😄 with score 1–5
- Below: recharts `<LineChart>` smooth curve, violet stroke
- Toggle: 7 gün / 30 gün
- Bottom: contribution heatmap calendar (color scale: gray → violet)

### Breathing Exercises
- 3 cards to select: "4-7-8", "Box Breathing", "Güven Nefesi"
- Selected → full-screen centered circle
- Framer Motion: `scale: 1 → 1.4 → 1.4 → 1` with phase labels
- Phase text: "Nefes Al" / "Tut" / "Nefes Ver"
- Countdown per phase, total rounds counter

### Goals
- Pull from `UserProfile.goals` (string array)
- Each goal: card with checkbox (local only — no backend change needed yet)
- Empty state: "Hedeflerini onboarding sırasında ekleyebilirsin"

---

## Visual Language

- Background: `#080810` (existing)
- Sidebar bg: `#0d0c1a`
- Card bg: `rgba(255,255,255,0.02)` with `border: rgba(255,255,255,0.05)`
- Accent: violet (`#7c3aed`) → cyan (`#06b6d4`) gradient
- Active state: `border-l-2 border-violet-500 bg-violet-500/10`
- All corners: `rounded-2xl` or `rounded-3xl`
- Shadows: colored glow (`shadow-violet-500/10`) not hard drop shadows
- Transitions: `transition-all duration-200`
