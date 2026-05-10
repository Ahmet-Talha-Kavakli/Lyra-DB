'use client';

/**
 * Full-screen aurora borealis background.
 *
 * Five large blurred gradient blobs animate independently at different speeds
 * and positions, creating a living, atmospheric depth effect.
 * Uses GPU-accelerated `transform` and `opacity` only — no layout thrashing.
 */
export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: '#030712' }}>
      {/* ── Aurora layer (fixed, below everything) ─────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {/* Blob 1 — violet (dominant brand color, top-center) */}
        <div style={{
          position: 'absolute',
          top: '-20%', left: '20%',
          width: '65vw', height: '65vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, rgba(109,40,217,0.28) 45%, transparent 72%)',
          filter: 'blur(72px)',
          animation: 'aurora-1 18s ease-in-out infinite',
          willChange: 'transform, opacity',
        }} />

        {/* Blob 2 — deep indigo (bottom-left) */}
        <div style={{
          position: 'absolute',
          bottom: '-10%', left: '-10%',
          width: '60vw', height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.50) 0%, rgba(67,56,202,0.25) 45%, transparent 72%)',
          filter: 'blur(80px)',
          animation: 'aurora-2 24s ease-in-out infinite',
          willChange: 'transform, opacity',
        }} />

        {/* Blob 3 — cyan/teal (right side, contrast accent) */}
        <div style={{
          position: 'absolute',
          top: '30%', right: '-15%',
          width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.30) 0%, rgba(6,182,212,0.14) 45%, transparent 72%)',
          filter: 'blur(90px)',
          animation: 'aurora-3 30s ease-in-out infinite',
          willChange: 'transform, opacity',
        }} />

        {/* Blob 4 — rose/magenta (warm contrast, top-right) */}
        <div style={{
          position: 'absolute',
          top: '-5%', right: '10%',
          width: '40vw', height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(217,70,239,0.35) 0%, rgba(192,38,211,0.16) 45%, transparent 72%)',
          filter: 'blur(68px)',
          animation: 'aurora-4 21s ease-in-out infinite',
          willChange: 'transform, opacity',
        }} />

        {/* Blob 5 — blue (center-bottom, depth) */}
        <div style={{
          position: 'absolute',
          bottom: '5%', left: '35%',
          width: '45vw', height: '38vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.28) 0%, rgba(37,99,235,0.12) 45%, transparent 72%)',
          filter: 'blur(100px)',
          animation: 'aurora-5 27s ease-in-out infinite',
          willChange: 'transform, opacity',
        }} />

        {/* Noise/grain texture overlay (subtle depth) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
          backgroundSize: '256px 256px',
          mixBlendMode: 'overlay',
          opacity: 0.4,
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Content layer ─────────────────────────────────────────────── */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
