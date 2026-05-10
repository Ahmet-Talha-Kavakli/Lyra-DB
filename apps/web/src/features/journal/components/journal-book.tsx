'use client';

import React, {
  useState, useCallback, useRef, forwardRef, useEffect,
} from 'react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';
import { Caveat } from 'next/font/google';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600', '700'] });

// ── Types ──────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  entryDate: string;
  content: string;
}

export interface JournalBookProps {
  entries: JournalEntry[];
  userId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]!;
}

function buildDates(entries: JournalEntry[]): string[] {
  const set = new Set(entries.map((e) => e.entryDate.split('T')[0]!));
  set.add(todayISO());
  return Array.from(set).sort();
}

function fmtWeekday(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short',
  });
}

// ── Page sizes (shared constant) ───────────────────────────────────────────────

const PAGE_W = 390;
const PAGE_H = 570;

// ── Cover ──────────────────────────────────────────────────────────────────────
//
// IMPORTANT: page-flip manipulates the forwardRef div directly via style.cssText,
// which overwrites all inline styles. So we put our real content inside an
// absolutely-positioned inner div that page-flip never touches.

const CoverPage = forwardRef<HTMLDivElement, object>((_, ref) => (
  <div ref={ref}>
    {/* Inner div — page-flip never touches children of the ref element */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: '#B8CCBE',
      backgroundImage: [
        'repeating-linear-gradient(135deg, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
        'repeating-linear-gradient(45deg,  transparent 0px, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
        'radial-gradient(ellipse at 28% 28%, rgba(255,255,255,0.24) 0%, transparent 52%)',
        'radial-gradient(ellipse at 50% 50%, transparent 48%, rgba(0,0,0,0.26) 100%)',
      ].join(', '),
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Embossed inset border */}
      <div style={{
        position: 'absolute', inset: 14,
        border: '1.5px solid rgba(255,255,255,0.28)',
        borderRadius: 3,
        boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.07)',
        pointerEvents: 'none',
      }} />

      {/* Left stitching */}
      <div style={{
        position: 'absolute', top: 28, bottom: 28, left: 28, width: 1,
        backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 6px, transparent 6px, transparent 10px)',
        pointerEvents: 'none',
      }} />

      {/* Icon circle */}
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        border: '1.5px solid rgba(60,80,60,0.28)',
        background: 'radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.2), transparent 60%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.14), inset 0 1px 2px rgba(255,255,255,0.2)',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 28, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.22))' }}>✦</span>
      </div>

      <div className={caveat.className} style={{
        fontSize: 46, fontWeight: 700, color: '#2c3d2e',
        letterSpacing: 2, lineHeight: 1,
        textShadow: '0 1px 2px rgba(255,255,255,0.3)',
      }}>
        Günlüğüm
      </div>

      <div style={{
        width: 70, height: 1.5, margin: '12px 0 10px',
        background: 'linear-gradient(to right, transparent, rgba(44,61,46,0.5), transparent)',
      }} />

      <div className={caveat.className} style={{ fontSize: 16, color: 'rgba(44,61,46,0.60)', letterSpacing: 1 }}>
        Lyra ile birlikte
      </div>
    </div>
  </div>
));
CoverPage.displayName = 'CoverPage';

// ── SafeTextarea — stops events at capture phase so page-flip never sees them ──
//
// React synthetic events are delegated to the root, so page-flip's native
// listener on distElement fires BEFORE React's onMouseDown. The fix is to
// attach a capture-phase native listener directly on the textarea element.

function SafeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => { e.stopPropagation(); };
    el.addEventListener('mousedown',   stop, { capture: true });
    el.addEventListener('touchstart',  stop, { capture: true });
    el.addEventListener('pointerdown', stop, { capture: true });
    return () => {
      el.removeEventListener('mousedown',   stop, true);
      el.removeEventListener('touchstart',  stop, true);
      el.removeEventListener('pointerdown', stop, true);
    };
  }, []);
  return <textarea ref={ref} {...props} />;
}

// ── Diary page ─────────────────────────────────────────────────────────────────

interface DiaryPageProps {
  date: string;
  content: string;
  pageIndex: number;
  total: number;
  isToday: boolean;
  onChange: (date: string, text: string) => void;
}

const DiaryPage = forwardRef<HTMLDivElement, DiaryPageProps>(
  ({ date, content: initialContent, pageIndex, total, isToday, onChange }, ref) => {
    // Local state: typing doesn't re-render parent (no lag)
    const [localText, setLocalText] = useState(initialContent);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync if parent resets content (e.g. entry loaded from server)
    useEffect(() => { setLocalText(initialContent); }, [initialContent]);

    const scheduleSave = useCallback((text: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // 2.5s debounce — like iOS Notes, save after user pauses
      saveTimer.current = setTimeout(() => onChange(date, text), 2500);
    }, [date, onChange]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalText(e.target.value);
      scheduleSave(e.target.value);
    };

    // Save immediately on blur (switching pages, closing tab, etc.)
    const handleBlur = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onChange(date, localText);
    };

    return (
    <div ref={ref}>
      {/* Inner content — not touched by page-flip */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: '#EFE0B8',
        backgroundImage: [
          'radial-gradient(ellipse at 12% 18%, rgba(160,120,60,0.13) 0%, transparent 45%)',
          'radial-gradient(ellipse at 88% 82%, rgba(140,100,50,0.11) 0%, transparent 42%)',
          'radial-gradient(ellipse at 50% 45%, rgba(255,248,210,0.28) 0%, transparent 62%)',
        ].join(', '),
        overflow: 'hidden',
      }}>
        {/* Red margin line */}
        <div style={{
          position: 'absolute', top: 72, bottom: 32, left: 50, width: 1.5,
          background: 'rgba(185,70,70,0.22)', pointerEvents: 'none',
        }} />

        {/* Ruled lines */}
        <div style={{
          position: 'absolute', top: 72, left: 54, right: 12, bottom: 32,
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(150,110,60,0.18) 31px, rgba(150,110,60,0.18) 32px)',
          pointerEvents: 'none',
        }} />

        {/* Top edge shadow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ padding: '12px 18px 0 58px' }}>
          <p className={caveat.className} style={{
            fontSize: 11, color: '#9a7d50', letterSpacing: '0.12em', marginBottom: 1,
          }}>
            {fmtWeekday(date)}
          </p>
          <p className={caveat.className} style={{
            fontSize: 22, fontWeight: 700, color: '#5c3d1e', marginBottom: 0,
          }}>
            {fmtDate(date)}
          </p>
          <div style={{ height: 1, marginTop: 4, background: 'linear-gradient(to right, rgba(150,110,60,0.4) 0%, transparent 80%)' }} />
        </div>

        {/* SafeTextarea — local state (no parent re-render on keypress) + iOS-style save */}
        <SafeTextarea
          value={localText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={isToday ? 'Bugün neler hissettin? Aklında neler var…' : ''}
          style={{
            position: 'absolute', top: 72, left: 58, right: 8, bottom: 32,
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', cursor: 'text',
            fontFamily: caveat.style.fontFamily, fontSize: 18.5, lineHeight: '32px',
            color: '#2c1a08', paddingTop: 10, paddingLeft: 2,
            caretColor: '#7c4a1e', zIndex: 10,
          }}
        />

        {/* Today ribbon */}
        {isToday && (
          <div style={{
            position: 'absolute', top: 0, right: 18, width: 16, height: 40,
            background: 'linear-gradient(to bottom, #6b9e7a, #4a7a5c)',
            clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }} />
        )}

        {/* Page number */}
        <div className={caveat.className} style={{
          position: 'absolute', bottom: 8, right: 16,
          fontSize: 11, color: '#b09070', letterSpacing: '0.05em',
        }}>
          {pageIndex} / {total}
        </div>
      </div>
    </div>
    );
  }
);
DiaryPage.displayName = 'DiaryPage';

// ── Main ───────────────────────────────────────────────────────────────────────

export default function JournalBook({ entries: initialEntries, userId }: JournalBookProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [saving, setSaving]   = useState<string | null>(null);

  const today    = todayISO();
  const dates    = buildDates(entries);
  const total    = dates.length;
  // With showCover=false: page 0 = cover, page 1 = first diary entry, etc.
  // On landscape (2-page spread): cover(left) + diary[0](right) at startPage=0
  // startPage=0 shows spread [0,1] → cover left, today right when dates.length===1
  // For navigating: todayIdx is 1-based index in dates array (as page number in book)
  const todayIdx = dates.indexOf(today) + 1;

  const [currentPage, setCurrentPage] = useState(todayIdx);

  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void; flip: (n: number) => void; getCurrentPageIndex: () => number } }>(null);

  // currentPage: 0 = cover, 1..total = diary entries
  const visibleDate = (currentPage === 0 || currentPage > total)
    ? null
    : dates[currentPage - 1] ?? null;

  const getContent = (date: string) =>
    entries.find((e) => e.entryDate.split('T')[0] === date)?.content ?? '';

  // Called by DiaryPage after its own debounce (2.5s) or on blur
  const handleChange = useCallback(async (date: string, text: string) => {
    setSaving(date);
    try {
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/journal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': userId },
        body: JSON.stringify({ date, content: text }),
      });
      if (res.ok) {
        const saved = await res.json() as JournalEntry;
        setEntries((prev) => {
          const idx = prev.findIndex((e) => e.entryDate.split('T')[0] === date);
          if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
          return [saved, ...prev];
        });
      }
    } finally {
      setSaving(null);
    }
  }, [userId]);

  const flipPrev  = () => bookRef.current?.pageFlip().flipPrev();
  const flipNext  = () => bookRef.current?.pageFlip().flipNext();
  const goToToday = () => { bookRef.current?.pageFlip().flip(todayIdx); setCurrentPage(todayIdx); };

  const handleFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
  }, []);

  // onInit fires after setHandlers — safe to update currentPage
  const handleInit = useCallback((e: { data: { page: number } }) => {
    setCurrentPage(e.data.page);
  }, []);

  useEffect(() => {
    setCurrentPage(todayIdx);
  }, [todayIdx]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 24, paddingTop: 28, paddingBottom: 32, minHeight: '100vh',
      userSelect: 'none',
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 className={caveat.className} style={{ fontSize: 32, fontWeight: 700, color: '#c8d8cf', margin: 0 }}>
          Günlük
        </h1>
        {saving && (
          <span style={{ fontSize: 12, color: 'rgba(200,216,207,0.5)' }}>kaydediliyor…</span>
        )}
      </div>

      {/* Book */}
      <div style={{
        display: 'flex', justifyContent: 'center', width: '100%',
        filter: 'drop-shadow(0 28px 56px rgba(0,0,0,0.72)) drop-shadow(0 6px 20px rgba(0,0,0,0.40))',
      }}>
        <HTMLFlipBook
          ref={bookRef}
          width={PAGE_W}
          height={PAGE_H}
          minWidth={260}
          maxWidth={460}
          minHeight={380}
          maxHeight={680}
          size="fixed"
          startPage={todayIdx}
          drawShadow
          flippingTime={900}
          usePortrait={false}
          startZIndex={20}
          autoSize={false}
          maxShadowOpacity={0.55}
          showCover={false}
          mobileScrollSupport={false}
          clickEventForward={false}
          useMouseEvents
          swipeDistance={40}
          showPageCorners
          disableFlipByClick
          className=""
          style={{ margin: '0 auto' }}
          onFlip={handleFlip}
          onInit={handleInit}
        >
          {/* Page 0: Cover */}
          <CoverPage />

          {/* Pages 1..n: One per day */}
          {dates.map((date, i) => (
            <DiaryPage
              key={date}
              date={date}
              content={getContent(date)}
              pageIndex={i + 1}
              total={total}
              isToday={date === today}
              onChange={handleChange}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={flipPrev} style={navBtnStyle} title="Önceki">
          <ChevronLeft size={18} />
        </button>

        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {visibleDate ? (
            <>
              <span className={caveat.className} style={{ fontSize: 19, color: '#c8d8cf' }}>
                {fmtDate(visibleDate)}
              </span>
              <span className={caveat.className} style={{ fontSize: 13, color: 'rgba(200,216,207,0.50)' }}>
                {fmtWeekday(visibleDate).charAt(0) + fmtWeekday(visibleDate).slice(1).toLowerCase()}
              </span>
            </>
          ) : (
            <span className={caveat.className} style={{ fontSize: 19, color: 'rgba(200,216,207,0.55)' }}>
              Günlüğüm
            </span>
          )}
        </div>

        <button onClick={flipNext} style={navBtnStyle} title="Sonraki">
          <ChevronRight size={18} />
        </button>

        {currentPage !== todayIdx && (
          <button onClick={goToToday} style={todayBtnStyle} title="Bugüne git">
            <CalendarDays size={13} />
            Bugün
          </button>
        )}
      </div>

      {/* Date dots */}
      {dates.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 560, padding: '0 16px' }}>
          {dates.map((date, i) => {
            const pageI   = i + 1;
            const isActive = currentPage === pageI;
            const isTod   = date === today;
            return (
              <button
                key={date}
                onClick={() => { bookRef.current?.pageFlip().flip(pageI); setCurrentPage(pageI); }}
                title={fmtDate(date)}
                style={{
                  borderRadius: 20, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  ...(isActive
                    ? { background: '#6b9e7a', color: '#fff', fontSize: 11, padding: '2px 10px' }
                    : isTod
                    ? { width: 8, height: 8, background: 'rgba(107,158,122,0.55)', padding: 0 }
                    : { width: 8, height: 8, background: 'rgba(255,255,255,0.15)', padding: 0 }),
                }}
              >
                {isActive ? fmtShort(date) : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  border: '1px solid rgba(200,216,207,0.20)',
  background: 'rgba(200,216,207,0.06)',
  color: '#c8d8cf', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const todayBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  borderRadius: 20, padding: '6px 16px',
  border: '1px solid rgba(200,216,207,0.25)',
  background: 'rgba(200,216,207,0.08)',
  color: '#c8d8cf', fontSize: 13, cursor: 'pointer',
};
