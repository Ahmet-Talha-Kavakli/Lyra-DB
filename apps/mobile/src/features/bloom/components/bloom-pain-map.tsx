/**
 * Bloom Pain Map — Logla form'undaki bölgesel ağrı işaretleme.
 *
 * Mimari (2026-05-21):
 * - Layered PNG asset: `body-base.png` (FAL-generated sil-3) + `repro-organs.png`
 *   (FAL-generated organ-2) — organ overlay front figürün alt karnına basılır.
 * - Severity highlight = render-time SVG overlay (region başına path) — PNG'nin
 *   üstüne basılır, bölge bazlı renkli wash gösterir.
 * - Region tap zone = görünmez `<Pressable>` overlay, koordinatlar PNG'nin
 *   1024×768 image koordinat sisteminde, ekrana scale ile map'lenir.
 * - Sheet açılışı = `RegionMarkSheet` (gerçek SwiftUI BottomSheet + Form).
 */

import { useMemo, useState } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  Image,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import type { IPainEntry, TBodyRegion } from '@ai-therapist/types';
import { colors } from '@/constants/theme';
import { RegionMarkSheet } from './region-mark-sheet';

// ── Asset boyutu (image koordinat sistemi) ─────────────────────────────────
// FAL output: 768×1024 (portrait_4_3)
// Front figür sol yarıda, back figür sağ yarıda
const ASSET_W = 768;
const ASSET_H = 1024;

// Organ asset (organ-2.png) — 1024×1024
const ORGAN_ASSET_W = 1024;

// Organ overlay konumu (front figürün alt karnı, image koordinatı)
// Front center x≈254, lower abdomen y≈360-440
const ORGAN_OVERLAY = {
  cx: 254,           // front figürün merkez X'i
  cy: 400,           // alt karın merkezi Y
  width: 130,        // overlay genişliği (image koordinatı)
};

// ── Severity ───────────────────────────────────────────────────────────────
export const SEVERITY_COLORS = ['#FFD60A', '#FF9F0A', '#FF3B30', '#B71C1C'] as const;
export type SeverityBucket = 1 | 2 | 3 | 4;

export function intensityToBucket(nrs: number): SeverityBucket {
  if (nrs <= 2) return 1;
  if (nrs <= 5) return 2;
  if (nrs <= 7) return 3;
  return 4;
}

export function bucketToIntensity(b: SeverityBucket): number {
  return ({ 1: 2, 2: 5, 3: 7, 4: 9 } as const)[b];
}

// ── Region label (Türkçe) ──────────────────────────────────────────────────
export const REGION_LABEL: Record<TBodyRegion, string> = {
  head:           'Baş',
  neck:           'Boyun',
  breast_left:    'Sol Göğüs',
  breast_right:   'Sağ Göğüs',
  upper_abdomen:  'Üst Karın',
  lower_abdomen:  'Alt Karın',
  ovary_left:     'Sol Yumurtalık',
  ovary_right:    'Sağ Yumurtalık',
  pelvis:         'Pelvis',
  upper_back:     'Üst Sırt',
  lower_back:     'Bel',
  hip_sacrum:     'Kalça / Sakrum',
  leg_upper:      'Uyluk',
  leg_lower:      'Baldır',
  joints:         'Eklem',
};

// ── Region geometry (image koordinatları, asset 768×1024) ─────────────────
// Her bölge için: side ('front'|'back'), tap merkezi + boyutu, highlight path.
// Front figür center x=254, back figür center x=532 (asset koordinatı).
type Side = 'front' | 'back';

interface RegionGeometry {
  region: TBodyRegion;
  side: Side;
  tap: { x: number; y: number; w: number; h: number };
  // Severity highlight SVG path (image koordinat sistemi)
  highlightPath?: string;
}

const REGION_GEOMETRY: RegionGeometry[] = [
  // ── FRONT (left figure, center x≈254) ──
  { region: 'head', side: 'front', tap: { x: 254, y: 90, w: 80, h: 100 },
    highlightPath: 'M 254 60 m -42 0 a 42 50 0 1 0 84 0 a 42 50 0 1 0 -84 0' },
  { region: 'neck', side: 'front', tap: { x: 254, y: 175, w: 40, h: 30 },
    highlightPath: 'M 234 165 L 274 165 L 274 195 L 234 195 Z' },
  { region: 'breast_left', side: 'front', tap: { x: 215, y: 275, w: 55, h: 55 },
    highlightPath: 'M 215 275 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0' },
  { region: 'breast_right', side: 'front', tap: { x: 295, y: 275, w: 55, h: 55 },
    highlightPath: 'M 295 275 m -28 0 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0' },
  { region: 'upper_abdomen', side: 'front', tap: { x: 254, y: 345, w: 90, h: 50 },
    highlightPath: 'M 209 325 L 299 325 L 299 365 L 209 365 Z' },
  { region: 'lower_abdomen', side: 'front', tap: { x: 254, y: 410, w: 100, h: 80 },
    highlightPath: 'M 204 370 L 304 370 L 304 450 L 204 450 Z' },
  // Yumurtalıklar — alt karın içinde, sol/sağ ayrı küçük tap zone
  { region: 'ovary_left', side: 'front', tap: { x: 222, y: 410, w: 36, h: 36 } },
  { region: 'ovary_right', side: 'front', tap: { x: 286, y: 410, w: 36, h: 36 } },
  { region: 'pelvis', side: 'front', tap: { x: 254, y: 470, w: 80, h: 40 },
    highlightPath: 'M 214 450 L 294 450 L 294 490 L 214 490 Z' },
  { region: 'leg_upper', side: 'front', tap: { x: 254, y: 600, w: 130, h: 130 },
    highlightPath: 'M 184 510 L 324 510 L 314 690 L 194 690 Z' },
  { region: 'leg_lower', side: 'front', tap: { x: 254, y: 800, w: 130, h: 130 },
    highlightPath: 'M 194 700 L 314 700 L 304 890 L 204 890 Z' },
  { region: 'joints', side: 'front', tap: { x: 254, y: 690, w: 130, h: 30 } },

  // ── BACK (right figure, center x≈532) ──
  { region: 'upper_back', side: 'back', tap: { x: 532, y: 270, w: 130, h: 100 },
    highlightPath: 'M 462 220 L 602 220 L 602 320 L 462 320 Z' },
  { region: 'lower_back', side: 'back', tap: { x: 532, y: 380, w: 110, h: 90 },
    highlightPath: 'M 472 335 L 592 335 L 592 425 L 472 425 Z' },
  { region: 'hip_sacrum', side: 'back', tap: { x: 532, y: 480, w: 140, h: 80 },
    highlightPath: 'M 462 440 L 602 440 L 602 520 L 462 520 Z' },
];

// ── Component props ────────────────────────────────────────────────────────
interface BloomPainMapProps {
  value: IPainEntry[];
  onChange: (next: IPainEntry[]) => void;
}

export function BloomPainMap({ value, onChange }: BloomPainMapProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [activeRegion, setActiveRegion] = useState<TBodyRegion | null>(null);
  const [renderW, setRenderW] = useState(0);

  // Severity color her bölge için
  const fills = useMemo<Partial<Record<TBodyRegion, string>>>(() => {
    const out: Partial<Record<TBodyRegion, string>> = {};
    for (const entry of value) {
      const color = SEVERITY_COLORS[intensityToBucket(entry.intensity) - 1];
      out[entry.region] = `${color}88`; // 88 alpha — okunur ama overpowering değil
    }
    return out;
  }, [value]);

  function entryFor(region: TBodyRegion): IPainEntry | null {
    return value.find((p) => p.region === region) ?? null;
  }

  function handleRegionPress(region: TBodyRegion) {
    void Haptics.selectionAsync();
    setActiveRegion(region);
  }

  function handleSheetSave(input: { type: IPainEntry['type']; intensity: number; note?: string }) {
    if (!activeRegion) return;
    const next = [...value];
    const idx = next.findIndex((p) => p.region === activeRegion);
    const entry: IPainEntry = {
      region: activeRegion,
      intensity: input.intensity,
      ...(input.type ? { type: input.type } : {}),
      ...(input.note ? { note: input.note } : {}),
    };
    if (idx >= 0) next[idx] = entry;
    else next.push(entry);
    onChange(next);
    setActiveRegion(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSheetDelete() {
    if (!activeRegion) return;
    onChange(value.filter((p) => p.region !== activeRegion));
    setActiveRegion(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Render ──
  // Asset orijinal boyutta 768×1024, ekrana render edilirken width'i sınırla.
  // Ekran genişliği ölçülüp ona göre scale yapılır.
  const renderH = renderW > 0 ? renderW * (ASSET_H / ASSET_W) : 0;
  const scale = renderW > 0 ? renderW / ASSET_W : 1;

  // Side'a göre crop — front sol yarıyı, back sağ yarıyı göster
  // Image'ı tüm yüzeye render edip viewbox/clip ile bölgeyi göstermek pratik değil RN'de;
  // bunun yerine container'ı half width'e ölçeklendir, image'i absolute pozisyonla offset ile yerleştir.
  const halfW = renderW;  // tek figür için
  const figureCenterX = side === 'front' ? 254 : 532;
  // Image offset: figürün center'ını container merkezinde hizalamak için
  // Image tam genişliği = ASSET_W * scale; container = renderW
  // offsetX = -(figureCenterX * scale - renderW / 2)
  const imageW = ASSET_W * scale;
  const imageH = ASSET_H * scale;
  const imageOffsetX = -(figureCenterX * scale - renderW / 2);

  // Görünür bölgeler (side'a uygun)
  const visibleRegions = REGION_GEOMETRY.filter((r) => r.side === side);

  return (
    <View>
      {/* Ön/Arka native UISegmentedControl */}
      <View style={st.segmentWrap}>
        <SegmentedControl
          values={['Ön', 'Arka']}
          selectedIndex={side === 'front' ? 0 : 1}
          onChange={(e) => {
            void Haptics.selectionAsync();
            setSide(e.nativeEvent.selectedSegmentIndex === 0 ? 'front' : 'back');
          }}
          appearance="dark"
          style={st.segment}
        />
      </View>

      {/* Silüet + organ + highlight + tap zones */}
      <View
        style={st.bodyWrap}
        onLayout={(e: LayoutChangeEvent) => setRenderW(e.nativeEvent.layout.width)}
      >
        {renderW > 0 && (
          <View style={{ width: halfW, height: imageH, overflow: 'hidden' }}>
            {/* Layer 1: base body */}
            <Image
              source={require('../../../../assets/bloom/body-base.png')}
              style={{
                position: 'absolute',
                left: imageOffsetX,
                top: 0,
                width: imageW,
                height: imageH,
              }}
              resizeMode="contain"
            />

            {/* Layer 2: organ overlay (sadece front'ta) */}
            {side === 'front' && (
              <Image
                source={require('../../../../assets/bloom/repro-organs.png')}
                style={{
                  position: 'absolute',
                  left: imageOffsetX + (ORGAN_OVERLAY.cx - ORGAN_OVERLAY.width / 2) * scale,
                  top: (ORGAN_OVERLAY.cy - ORGAN_OVERLAY.width / 2) * scale,
                  width: ORGAN_OVERLAY.width * scale,
                  height: ORGAN_OVERLAY.width * scale,
                  opacity: 0.85,
                }}
                resizeMode="contain"
              />
            )}

            {/* Layer 3: severity highlight SVG overlay */}
            <Svg
              width={imageW}
              height={imageH}
              viewBox={`0 0 ${ASSET_W} ${ASSET_H}`}
              style={{
                position: 'absolute',
                left: imageOffsetX,
                top: 0,
              }}
              pointerEvents="none"
            >
              {visibleRegions.map((g) => {
                const fill = fills[g.region];
                if (!fill || !g.highlightPath) return null;
                return (
                  <Path
                    key={g.region}
                    d={g.highlightPath}
                    fill={fill}
                    opacity={0.9}
                  />
                );
              })}
            </Svg>

            {/* Layer 4: tap zones */}
            {visibleRegions.map((g) => (
              <Pressable
                key={`tap-${g.region}`}
                onPress={() => handleRegionPress(g.region)}
                hitSlop={4}
                style={{
                  position: 'absolute',
                  left: imageOffsetX + (g.tap.x - g.tap.w / 2) * scale,
                  top: (g.tap.y - g.tap.h / 2) * scale,
                  width: g.tap.w * scale,
                  height: g.tap.h * scale,
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Sayaç */}
      {value.length > 0 && (
        <RNText style={st.summary}>{value.length} bölge işaretli</RNText>
      )}

      <RegionMarkSheet
        visible={activeRegion !== null}
        title={activeRegion ? REGION_LABEL[activeRegion] : ''}
        existing={activeRegion ? entryFor(activeRegion) : null}
        onCancel={() => setActiveRegion(null)}
        onSave={handleSheetSave}
        onDelete={handleSheetDelete}
      />
    </View>
  );
}

const st = StyleSheet.create({
  segmentWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  segment: { minWidth: 180 },

  bodyWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  summary: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
