/**
 * Defter sırtı bileşeni — system (Journal + Secret) ve custom defterler için.
 *
 * Mimari:
 *  - 3 silüet ('classic' düz / 'arched' kemerli / 'pointed' sivri).
 *  - Renkler dış parametre (`colors` prop) → tema sistemi ve sistem defterler
 *    aynı bileşeni kullanır, sadece renk paleti farklı geçilir.
 *  - Bombe efekti, üst/alt kapak şeridi, yan dikey detay çizgileri,
 *    orta dikdörtgen çerçeve + monogram (tek harf) — hepsi her variant'ta var.
 *  - Secret'a özel: `showLock` (kilit) + üst kemer iç koyu kontur şeridi.
 *
 * Hibrit: Skia (gövde + dekor + kilit), RN Text (Playfair Display monogram).
 *
 * Pivot: Defterler dik render edilir; lean=0 default. Eğim verilirse alt-sol köşe
 * pivottur.
 */

import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Group,
  Path,
  Skia,
  BlurMask,
  Circle,
  RoundedRect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

// ─── Tipler ──────────────────────────────────────────────────────────────────

import type { Silhouette } from './notebooks';

export interface SpineColors {
  /** Gövde ana rengi */
  spine: string;
  /** Üst/alt kapak şeridi (gövdenin koyu varyantı) */
  spineDeep: string;
  /** Yan dikey çizgi rengi */
  edgeLine: string;
  /** Orta dikdörtgen çerçeve rengi */
  frame: string;
  /** Monogram (tek harf) rengi */
  monogram: string;
  /** Kilit gövde rengi (showLock=true ise) */
  lockMain?: string;
  /** Kilit anahtar deliği rengi */
  lockHole?: string;
}

export interface SystemSpineProps {
  silhouette: Silhouette;
  title: string;
  width: number;
  height: number;
  colors: SpineColors;
  /** Secret defterine özel — krem/altın kilit ikonu çerçevenin altında */
  showLock?: boolean;
  /** Eğim (derece). 0 = dik. */
  lean?: number;
}

// ─── Asma kilit Skia path ────────────────────────────────────────────────────
const LOCK_PATH = Skia.Path.MakeFromSVGString(
  'M 7 12 L 7 8 ' +
  'A 5 5 0 0 1 17 8 ' +
  'L 17 12 ' +
  'M 5 12 ' +
  'L 19 12 ' +
  'Q 21 12 21 14 ' +
  'L 21 22 ' +
  'Q 21 24 19 24 ' +
  'L 5 24 ' +
  'Q 3 24 3 22 ' +
  'L 3 14 ' +
  'Q 3 12 5 12 ' +
  'Z',
);

// ─── Yan dikey çizgiler — sayfa kenarı izlenimi ─────────────────────────────

function EdgeLines({
  W, yTop, yBot, color,
}: { W: number; yTop: number; yBot: number; color: string }) {
  const lineW = 0.8;
  const inset = W * 0.08;
  return (
    <>
      <RoundedRect
        x={inset}
        y={yTop}
        width={lineW}
        height={yBot - yTop}
        r={0.4}
        color={color}
      />
      <RoundedRect
        x={W - inset - lineW}
        y={yTop}
        width={lineW}
        height={yBot - yTop}
        r={0.4}
        color={color}
      />
    </>
  );
}

// ─── Bombe gradient (yatay silindirik 3D his) ────────────────────────────────

const BOMBE_COLORS = [
  'rgba(0,0,0,0.22)',
  'rgba(0,0,0,0)',
  'rgba(255,255,255,0.10)',
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0.18)',
];
const BOMBE_POSITIONS = [0, 0.18, 0.42, 0.72, 1];

// ─── Gövde path'leri (silüete göre) ──────────────────────────────────────────

/** Classic: 4 köşe yuvarlak dikdörtgen (Journal stili). */
function buildClassicBody(W: number, H: number, R: number) {
  const p = Skia.Path.Make();
  p.moveTo(R, 0);
  p.lineTo(W - R, 0);
  p.quadTo(W, 0, W, R);
  p.lineTo(W, H - R);
  p.quadTo(W, H, W - R, H);
  p.lineTo(R, H);
  p.quadTo(0, H, 0, H - R);
  p.lineTo(0, R);
  p.quadTo(0, 0, R, 0);
  p.close();
  return p;
}

/** Arched: üst kemer (yarım daire benzeri), düz alt (Secret stili). */
function buildArchedBody(W: number, H: number, archH: number) {
  const p = Skia.Path.Make();
  // Alt köşelere yumuşak yuvarlama (classic'teki ile uyumlu).
  const R = Math.min(W, H) * 0.18;
  p.moveTo(0, archH);
  p.cubicTo(0, archH * 0.20, W, archH * 0.20, W, archH);
  p.lineTo(W, H - R);
  p.quadTo(W, H, W - R, H);
  p.lineTo(R, H);
  p.quadTo(0, H, 0, H - R);
  p.lineTo(0, archH);
  p.close();
  return p;
}

/** Pointed: üstü hafif çatı/kemer şeklinde (alçak piramit), düz alt.
 *  Geniş tabanlı + alçak tepe + yuvarlatılmış zirve → mezar taşı/tapınak çatısı. */
function buildPointedBody(W: number, H: number, peakH: number, R: number) {
  const p = Skia.Path.Make();
  // Yan duvarların başladığı yükseklik: çatı eğiminin tabanı
  const eaveY = peakH;
  // Tepe platosunun yarı-genişliği — yumuşak yay için kullanılır
  const peakHalfW = W * 0.22;

  // Sol-üst eğim başlangıcı
  p.moveTo(0, eaveY);
  p.lineTo(0, H - R);
  p.quadTo(0, H, R, H);
  p.lineTo(W - R, H);
  p.quadTo(W, H, W, H - R);
  p.lineTo(W, eaveY);
  // Sağ yamaç → tepe (yumuşak yay, plato değil belirgin yuvarlak zirve)
  p.quadTo(W, eaveY * 0.4, W * 0.5 + peakHalfW, eaveY * 0.25);
  p.quadTo(W * 0.5, 0, W * 0.5 - peakHalfW, eaveY * 0.25);
  p.quadTo(0, eaveY * 0.4, 0, eaveY);
  p.close();
  return p;
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

export function SystemNotebookSpine({
  silhouette,
  title,
  width,
  height,
  colors,
  showLock = false,
  lean = 0,
}: SystemSpineProps) {
  const W = width;
  const H = height;

  // Köşe yuvarlama (classic için)
  const CORNER_R = 12;
  // Kemer/sivri yüksekliği
  const ARCH_H = W * 0.50;
  // Pointed: alçak çatı (yelken sivriliği değil). Genişliğin %25'i kadar yükseklik
  // yeterli — yumuşak piramit/tapınak hissi.
  const PEAK_H = W * 0.25;

  // Üst/alt kapak şerit yüksekliği
  // Classic: üst 6%, alt 3% (Journal'daki düzeltilmiş orana göre)
  // Arched: alt 7% (üst kapak yok, kemer kendisi)
  // Pointed: alt 6%
  const TOP_CAP_H = silhouette === 'classic' ? H * 0.06 : 0;
  const BOT_CAP_H = silhouette === 'classic' ? H * 0.03
                  : silhouette === 'arched'  ? H * 0.07
                  : H * 0.06;

  // Gövde path
  const bodyPath =
    silhouette === 'classic' ? buildClassicBody(W, H, CORNER_R)
    : silhouette === 'arched' ? buildArchedBody(W, H, ARCH_H)
    : buildPointedBody(W, H, PEAK_H, CORNER_R);

  // Üst kapak şeridi (classic için path ile köşe uyumu)
  const topCapPath = (() => {
    if (silhouette !== 'classic') return null;
    const p = Skia.Path.Make();
    p.moveTo(CORNER_R, 0);
    p.lineTo(W - CORNER_R, 0);
    p.quadTo(W, 0, W, CORNER_R);
    p.lineTo(W, TOP_CAP_H);
    p.lineTo(0, TOP_CAP_H);
    p.lineTo(0, CORNER_R);
    p.quadTo(0, 0, CORNER_R, 0);
    p.close();
    return p;
  })();

  // Alt kapak şeridi (classic için path ile köşe uyumu)
  const botCapPath = (() => {
    if (silhouette !== 'classic') return null;
    const p = Skia.Path.Make();
    p.moveTo(0, H - BOT_CAP_H);
    p.lineTo(W, H - BOT_CAP_H);
    p.lineTo(W, H - CORNER_R);
    p.quadTo(W, H, W - CORNER_R, H);
    p.lineTo(CORNER_R, H);
    p.quadTo(0, H, 0, H - CORNER_R);
    p.close();
    return p;
  })();

  // Kemer iç kontur (arched için)
  const archInnerPath = (() => {
    if (silhouette !== 'arched') return null;
    const p = Skia.Path.Make();
    p.moveTo(2, ARCH_H + 0.5);
    p.cubicTo(2, ARCH_H * 0.30, W - 2, ARCH_H * 0.30, W - 2, ARCH_H + 0.5);
    return p;
  })();

  // Yan çizgilerin Y aralığı (silüete göre)
  const edgeYTop = silhouette === 'classic' ? TOP_CAP_H + 4
                 : silhouette === 'arched'  ? ARCH_H + 8
                 : PEAK_H * 0.6 + 4;
  const edgeYBot = H - BOT_CAP_H - 4;

  // Orta çerçeve geometrisi (her silüette aynı)
  const FRAME_W   = W * 0.55;
  const FRAME_X   = (W - FRAME_W) / 2;
  const FRAME_TOP = H * 0.36;
  const FRAME_BOT = H * 0.68;
  const FRAME_H   = FRAME_BOT - FRAME_TOP;

  // Monogram (tek harf)
  const initial = (title?.[0] ?? '').toUpperCase();
  const monogramSize = Math.min(W * 0.55, 24);
  const monogramBoxH = monogramSize * 1.4;
  const frameCenterY = (FRAME_TOP + FRAME_BOT) / 2;
  const monogramTop = frameCenterY - monogramBoxH / 2;

  // Kilit (Secret için, çerçevenin altında)
  const LOCK_SIZE = W * 0.32;
  const LOCK_CY   = H * 0.78;
  const lockMain = colors.lockMain ?? '#E0B45A';
  const lockHole = colors.lockHole ?? '#8C5F18';

  return (
    <View
      style={{
        width: W,
        height: H,
        transform: lean !== 0 ? [{ rotate: `${lean}deg` }] : undefined,
        ...(lean !== 0 && { transformOrigin: '0% 100%' as any }),
      }}
    >
      <Canvas style={{ width: W, height: H }}>
        <Group>
          {/* Yer gölgesi */}
          <RoundedRect
            x={2}
            y={H - 3}
            width={W - 4}
            height={5}
            r={2.5}
            color="rgba(0,0,0,0.30)"
          >
            <BlurMask blur={3} style="normal" />
          </RoundedRect>

          {/* Ana gövde — düz blok renk */}
          <Path path={bodyPath} color={colors.spine} />

          {/* Bombe efekti — yatay gradient (silindirik 3D his) */}
          <Path path={bodyPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(W, 0)}
              colors={BOMBE_COLORS}
              positions={BOMBE_POSITIONS}
            />
          </Path>

          {/* Üst kapak şeridi (classic için) */}
          {topCapPath && <Path path={topCapPath} color={colors.spineDeep} />}

          {/* Kemer iç kontur (arched için) */}
          {archInnerPath && (
            <Path
              path={archInnerPath}
              style="stroke"
              strokeWidth={1.4}
              color={colors.spineDeep}
            />
          )}

          {/* Üst kapak ince şerit (arched: kemerin altında, pointed: yok) */}
          {silhouette === 'arched' && (
            <RoundedRect
              x={2}
              y={ARCH_H + 4}
              width={W - 4}
              height={H * 0.025}
              r={1}
              color={colors.spineDeep}
            />
          )}

          {/* Alt kapak şeridi */}
          {silhouette === 'classic' && botCapPath && (
            <Path path={botCapPath} color={colors.spineDeep} />
          )}
          {silhouette !== 'classic' && (
            <RoundedRect
              x={0}
              y={H - BOT_CAP_H}
              width={W}
              height={BOT_CAP_H}
              r={Math.min(W, H) * 0.18}
              color={colors.spineDeep}
            />
          )}

          {/* Yan dikey çizgiler */}
          <EdgeLines W={W} yTop={edgeYTop} yBot={edgeYBot} color={colors.edgeLine} />

          {/* Orta dikdörtgen çerçeve — sadece kontur, içi boş */}
          <RoundedRect
            x={FRAME_X}
            y={FRAME_TOP}
            width={FRAME_W}
            height={FRAME_H}
            r={2}
            style="stroke"
            strokeWidth={1.4}
            color={colors.frame}
          />

          {/* Kilit (sadece Secret) — çerçevenin altında, dekoratif */}
          {showLock && LOCK_PATH && (
            <Group
              transform={[
                { translateX: W / 2 - LOCK_SIZE / 2 },
                { translateY: LOCK_CY - LOCK_SIZE / 2 },
                { scale: LOCK_SIZE / 24 },
              ]}
            >
              <Path path={LOCK_PATH} color={lockMain} />
              <Circle cx={12} cy={17} r={1.6} color={lockHole} />
            </Group>
          )}
        </Group>
      </Canvas>

      {/* Tek harf monogram — Playfair Display 900 Black, çerçeve merkezinde */}
      <View
        pointerEvents="none"
        style={[
          styles.monogramWrap,
          {
            top: monogramTop,
            height: monogramBoxH,
          },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.monogram,
            {
              color: colors.monogram,
              fontSize: monogramSize,
              lineHeight: monogramSize * 1.1,
            },
          ]}
        >
          {initial}
        </Text>
      </View>
    </View>
  );
}

// ─── System defter renk paletleri (Journal + Secret) ────────────────────────
// Bu sabitleri library-shelf burada import ederek system defterler için kullanır.

export const JOURNAL_COLORS: SpineColors = {
  spine:     '#C8332A',
  spineDeep: '#7A1A14',
  edgeLine:  '#7A1A14',
  frame:     '#C9B07A',
  monogram:  '#C9B07A',
};

export const SECRET_COLORS: SpineColors = {
  spine:     '#1A1A1A',
  spineDeep: '#000000',
  edgeLine:  '#D4A547',
  frame:     '#D4A547',
  monogram:  '#E0B45A',
  lockMain:  '#E0B45A',
  lockHole:  '#8C5F18',
};

const styles = StyleSheet.create({
  monogramWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
