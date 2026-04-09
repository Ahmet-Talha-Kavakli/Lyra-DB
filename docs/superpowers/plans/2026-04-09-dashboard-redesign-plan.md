# Implementation Plan — Dashboard Redesign

**Spec:** `docs/superpowers/specs/2026-04-09-dashboard-redesign.md`
**Goal:** Sidebar layout + Journal, Mood Tracker, Breathing, Goals pages
**Stack:** Next.js 16 (App Router), Tailwind v4, Framer Motion, Recharts, Lucide

---

## Phase 0 — Dependencies

- [ ] Install frontend deps
  ```bash
  cd apps/web && pnpm add framer-motion recharts lucide-react
  ```
  Verify: `pnpm ls framer-motion recharts lucide-react` shows versions

---

## Phase 1 — Database & API: Journal

- [ ] Add `JournalEntry` model to `apps/api/prisma/schema.prisma`
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
  ```
  Also add `journalEntries JournalEntry[]` to the `User` model.

- [ ] Run migration
  ```bash
  cd apps/api && pnpm prisma migrate dev --name add_journal_entries
  ```

- [ ] Create `apps/api/src/modules/journal/journal.service.ts`
  ```ts
  import { Injectable } from '@nestjs/common';
  import { PrismaService } from '@/shared/prisma/prisma.service';

  @Injectable()
  export class JournalService {
    constructor(private prisma: PrismaService) {}

    async upsert(userId: string, date: string, content: string) {
      const entryDate = new Date(date);
      return this.prisma.journalEntry.upsert({
        where: { userId_entryDate: { userId, entryDate } },
        create: { userId, entryDate, content },
        update: { content },
      });
    }

    async getByDate(userId: string, date: string) {
      return this.prisma.journalEntry.findUnique({
        where: { userId_entryDate: { userId, entryDate: new Date(date) } },
      });
    }

    async list(userId: string) {
      return this.prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { entryDate: 'desc' },
        select: { id: true, entryDate: true, content: true },
      });
    }
  }
  ```

- [ ] Create `apps/api/src/modules/journal/journal.controller.ts`
  ```ts
  import { Controller, Get, Put, Body, Query, Headers } from '@nestjs/common';
  import { JournalService } from './journal.service';

  @Controller('journal')
  export class JournalController {
    constructor(private journal: JournalService) {}

    @Get()
    list(@Headers('x-clerk-user-id') clerkId: string) {
      return this.journal.listByClerkId(clerkId);
    }

    @Get('entry')
    getEntry(
      @Headers('x-clerk-user-id') clerkId: string,
      @Query('date') date: string,
    ) {
      return this.journal.getByClerkId(clerkId, date);
    }

    @Put()
    upsert(
      @Headers('x-clerk-user-id') clerkId: string,
      @Body() body: { date: string; content: string },
    ) {
      return this.journal.upsertByClerkId(clerkId, body.date, body.content);
    }
  }
  ```
  Note: Service methods need to resolve clerkId → userId via `prisma.user.findUnique({ where: { clerkId } })` first.

- [ ] Create `apps/api/src/modules/journal/journal.module.ts` and register in `app.module.ts`

---

## Phase 2 — Database & API: Mood

- [ ] Add `MoodLog` model to schema
  ```prisma
  model MoodLog {
    id       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    userId   String   @map("user_id") @db.Uuid
    score    Int
    loggedAt DateTime @default(now()) @map("logged_at")
    user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@map("mood_logs")
  }
  ```
  Add `moodLogs MoodLog[]` to `User` model.

- [ ] Run migration
  ```bash
  cd apps/api && pnpm prisma migrate dev --name add_mood_logs
  ```

- [ ] Create `apps/api/src/modules/mood/mood.service.ts`
  ```ts
  @Injectable()
  export class MoodService {
    constructor(private prisma: PrismaService) {}

    async log(userId: string, score: number) {
      return this.prisma.moodLog.create({ data: { userId, score } });
    }

    async history(userId: string, days: number) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      return this.prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: since } },
        orderBy: { loggedAt: 'asc' },
        select: { score: true, loggedAt: true },
      });
    }
  }
  ```

- [ ] Create `apps/api/src/modules/mood/mood.controller.ts`
  ```ts
  @Controller('mood')
  export class MoodController {
    @Post()
    log(@Headers('x-clerk-user-id') clerkId: string, @Body() body: { score: number }) { ... }

    @Get('history')
    history(@Headers('x-clerk-user-id') clerkId: string, @Query('days') days = '7') { ... }
  }
  ```

- [ ] Create mood module, register in `app.module.ts`

---

## Phase 3 — Sidebar Component

- [ ] Create `apps/web/src/features/dashboard/components/sidebar.tsx`
  ```tsx
  'use client';
  import { motion, AnimatePresence } from 'framer-motion';
  import { usePathname } from 'next/navigation';
  import Link from 'next/link';
  import {
    Home, Brain, BookOpen, SmilePlus, ClipboardList,
    Wind, Target, User, ChevronLeft, ChevronRight
  } from 'lucide-react';
  import { useState } from 'react';
  import { useUser } from '@clerk/nextjs';

  const NAV_ITEMS = [
    { href: '/dashboard',  icon: Home,          label: 'Ana Sayfa' },
    { href: '/session',    icon: Brain,         label: 'Seans' },
    { href: '/journal',    icon: BookOpen,      label: 'Günlük' },
    { href: '/mood',       icon: SmilePlus,     label: 'Duygu Takibi' },
    { href: '/history',    icon: ClipboardList, label: 'Geçmiş' },
    { href: '/breathe',    icon: Wind,          label: 'Nefes' },
    { href: '/goals',      icon: Target,        label: 'Hedefler' },
    { href: '/profile',    icon: User,          label: 'Profil' },
  ];

  export function Sidebar({ locale }: { locale: string }) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { user } = useUser();
    const prefix = locale === 'tr' ? '/tr' : '';

    return (
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col h-full bg-[#0d0c1a] border-r border-white/5"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-bold text-white text-lg"
              >
                Lyra
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.includes(href) && href !== '/dashboard'
              ? true
              : pathname.endsWith('/dashboard') && href === '/dashboard';
            return (
              <Link
                key={href}
                href={`${prefix}${href}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                  ${active
                    ? 'bg-violet-500/10 border-l-2 border-violet-500 text-violet-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* User + collapse toggle */}
        <div className="px-2 pb-4 border-t border-white/5 pt-3 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <img
              src={user?.imageUrl}
              alt={user?.firstName ?? ''}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-sm text-gray-400 truncate"
                >
                  {user?.firstName}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors mx-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </motion.aside>
    );
  }
  ```

- [ ] Update `apps/web/src/app/[locale]/(dashboard)/layout.tsx`
  Replace the `<nav>` top bar with sidebar + content layout:
  ```tsx
  import { Sidebar } from '@/features/dashboard/components/sidebar';

  export default async function DashboardLayout({ children, params }) {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');
    const { locale } = await params;

    return (
      <div className="flex h-screen bg-[#080810] overflow-hidden">
        <Sidebar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }
  ```

---

## Phase 4 — Dashboard Home Page

- [ ] Rewrite `apps/web/src/app/[locale]/(dashboard)/dashboard/page.tsx`
  ```tsx
  // Server component — fetches last session + today's mood status
  // Renders: HomeGreeting, StreakCard, QuickMoodRow, LastSessionCard, StartSessionCTA
  ```

- [ ] Create `apps/web/src/features/dashboard/components/home-greeting.tsx`
  ```tsx
  'use client';
  export function HomeGreeting({ name }: { name: string }) {
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? 'Günaydın' :
      hour < 17 ? 'İyi günler' :
      hour < 21 ? 'İyi akşamlar' : 'İyi geceler';
    return (
      <div>
        <h1 className="text-3xl font-bold text-white">{greeting}, {name}</h1>
        <p className="text-gray-500 mt-1">Bugün nasıl hissediyorsun?</p>
      </div>
    );
  }
  ```

- [ ] Create `apps/web/src/features/dashboard/components/streak-card.tsx`
  Framer Motion flame pulse animation + streak count from API

- [ ] Create `apps/web/src/features/dashboard/components/quick-mood-row.tsx`
  5 emoji buttons (client component) — clicking calls `POST /mood` then shows confirmation

---

## Phase 5 — Journal Page

- [ ] Create `apps/web/src/app/[locale]/(dashboard)/journal/page.tsx`
  Server component: fetch journal list, pass to client `JournalView`

- [ ] Create `apps/web/src/features/journal/components/journal-view.tsx`
  ```tsx
  'use client';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Caveat } from 'next/font/google';

  const caveat = Caveat({ subsets: ['latin'] });

  // Two-column layout: left = entry list, right = editor
  // AnimatePresence on selected entry change:
  //   initial: { x: 60, opacity: 0, rotateY: 8 }
  //   animate: { x: 0, opacity: 1, rotateY: 0 }
  //   exit:    { x: -60, opacity: 0, rotateY: -8 }
  ```

- [ ] Create `apps/web/src/features/journal/components/journal-editor.tsx`
  ```tsx
  'use client';
  // Textarea with Caveat font
  // lined-paper background via CSS:
  //   backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.05) 27px, rgba(255,255,255,0.05) 28px)'
  // Debounced autosave (1000ms) → PUT /journal
  // useCallback + setTimeout for debounce
  ```

- [ ] Create `apps/web/src/features/journal/components/journal-entry-list.tsx`
  List of past entries by date, grouped by month

---

## Phase 6 — Mood Tracker Page

- [ ] Create `apps/web/src/app/[locale]/(dashboard)/mood/page.tsx`
  Server component: fetch mood history (30 days)

- [ ] Create `apps/web/src/features/mood/components/mood-checkin.tsx`
  ```tsx
  'use client';
  const MOODS = [
    { score: 1, emoji: '😢', label: 'Çok kötü' },
    { score: 2, emoji: '😕', label: 'Kötü' },
    { score: 3, emoji: '😐', label: 'Orta' },
    { score: 4, emoji: '🙂', label: 'İyi' },
    { score: 5, emoji: '😄', label: 'Harika' },
  ];
  // POST /mood on click, show success toast
  ```

- [ ] Create `apps/web/src/features/mood/components/mood-trend-chart.tsx`
  ```tsx
  'use client';
  import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
  // Toggle: 7 gün / 30 gün (useState)
  // Stroke: #7c3aed, strokeWidth: 2, dot: false, smooth curve (type="monotone")
  // Custom tooltip showing date + mood emoji
  ```

- [ ] Create `apps/web/src/features/mood/components/mood-heatmap.tsx`
  Calendar grid: last 4 months, each day colored by score (gray → violet gradient)

---

## Phase 7 — Breathing Exercises Page

- [ ] Create `apps/web/src/app/[locale]/(dashboard)/breathe/page.tsx`
  Pure client page (no data fetching needed)

- [ ] Create `apps/web/src/features/breathe/components/breathing-exercise.tsx`
  ```tsx
  'use client';
  const EXERCISES = {
    '4-7-8':  [{ label: 'Nefes Al', dur: 4 }, { label: 'Tut', dur: 7 }, { label: 'Ver', dur: 8 }],
    'box':    [{ label: 'Nefes Al', dur: 4 }, { label: 'Tut', dur: 4 }, { label: 'Ver', dur: 4 }, { label: 'Tut', dur: 4 }],
    'calm':   [{ label: 'Nefes Al', dur: 5 }, { label: 'Ver', dur: 6 }],
  };
  // Framer Motion circle: animate scale 1 → 1.5 (inhale) → 1.5 (hold) → 1 (exhale)
  // Duration matches phase seconds
  // Phase label shown inside circle
  // Round counter + stop button
  ```

---

## Phase 8 — Goals Page

- [ ] Create `apps/web/src/app/[locale]/(dashboard)/goals/page.tsx`
  Server component: fetch `UserProfile.goals` from API

- [ ] Create `apps/web/src/features/goals/components/goals-list.tsx`
  ```tsx
  // Map string[] goals to cards with checkbox (local state only)
  // Empty state: "Hedeflerini onboarding sırasında ekleyebilirsin"
  ```

---

## Phase 9 — Polish & Integration

- [ ] Add `apps/web/src/app/[locale]/(dashboard)/session/page.tsx` redirect to existing session flow
- [ ] Verify all sidebar links resolve correctly with locale prefix
- [ ] Add `loading.tsx` files for each new route (skeleton loaders)
- [ ] Responsive: sidebar collapses by default on mobile (`useEffect` + window width)
- [ ] Commit all changes

---

## Files Created/Modified Summary

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | modify — add JournalEntry, MoodLog |
| `apps/api/src/modules/journal/*` | create |
| `apps/api/src/modules/mood/*` | create |
| `apps/api/src/app.module.ts` | modify — register new modules |
| `apps/web/src/app/[locale]/(dashboard)/layout.tsx` | rewrite |
| `apps/web/src/app/[locale]/(dashboard)/dashboard/page.tsx` | rewrite |
| `apps/web/src/app/[locale]/(dashboard)/journal/page.tsx` | create |
| `apps/web/src/app/[locale]/(dashboard)/mood/page.tsx` | create |
| `apps/web/src/app/[locale]/(dashboard)/breathe/page.tsx` | create |
| `apps/web/src/app/[locale]/(dashboard)/goals/page.tsx` | create |
| `apps/web/src/features/dashboard/components/*` | create |
| `apps/web/src/features/journal/components/*` | create |
| `apps/web/src/features/mood/components/*` | create |
| `apps/web/src/features/breathe/components/*` | create |
| `apps/web/src/features/goals/components/*` | create |
