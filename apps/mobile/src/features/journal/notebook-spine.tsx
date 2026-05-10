import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  Rect,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  vec,
  Group,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { getTheme, getThickness, type Notebook } from './notebooks';

/**
 * Pixar/Disney tarzı şişko defter sırtı.
 *
 * Skia katman sırası (alttan üste):
 *   1. Ana yatay gradient (sol ışık → sağ gölge, 3D yuvarlık)
 *   2. Dikey fade (üst-alt derinlik)
 *   3. Sayfa kenarı katmanları (kalınlığa göre 1 veya 3)
 *   4. Altın emboss bantlar (üst + alt, 3 katman)
 *   5. Pixar puffy radial highlight (üst-sol blob)
 *   6. Sol rim light (ince parlak kenar)
 *   7. Sağ kenar gölge (kalınlığa göre opacity)
 *   8. Alt gölge (zemine oturma hissi)
 *   9. İç emboss çerçeve
 *
 * `lean` prop rotation pivot sol-alt köşedir → fizyolojik yaslanma.
 */

export const SPINE_HEIGHT = 88;   // raf-bazlı default; library-shelf override eder
export const SPINE_WIDTH  = 38;

/** Defterin sırtında görünecek yazı. System defterler için özel ("J" / "Secret"). */
function getSpineText(notebook: Notebook): string[] {
  if (notebook.type === 'standard') return ['J'];                  // Günlük → tek harf
  if (notebook.type === 'private')  return ['S','E','C','R','E','T']; // Secret
  // Custom — ismin ilk harflerini sırtta dikey yığ
  const maxChars = notebook.thicknessId === 'thick' ? 6 : 4;
  return notebook.name.toUpperCase().slice(0, maxChars).split('');
}

export function NotebookSpine({
  notebook,
  onPress,
  onLongPress,
  overrideWidth,
  overrideHeight,
  lean = 0,
}: {
  notebook: Notebook;
  onPress: () => void;
  onLongPress?: () => void;
  overrideWidth?: number;
  overrideHeight?: number;
  /** Yaslanma derecesi (deg). Pivot sol-alt köşe. */
  lean?: number;
}) {
  const theme     = getTheme(notebook.themeId);
  const thickness = getThickness(notebook.thicknessId);
  const W = overrideWidth  ?? SPINE_WIDTH;
  const H = overrideHeight ?? SPINE_HEIGHT;

  const letters = getSpineText(notebook);
  // System "Günlük" J büyük göster — tek harf, büyük font
  const isSingleBigLetter = notebook.type === 'standard';

  const pageEdges = useMemo(() => {
    const layers = thickness.pageLayers;
    const edges: { x1: number; x2: number; y: number }[] = [];
    const innerTop    = H * 0.20;
    const innerBottom = H * 0.80;
    const range = innerBottom - innerTop;
    for (let i = 0; i < layers; i++) {
      const t = (i + 1) / (layers + 1);
      const jitter = i % 2 === 0 ? 1.5 : -1.5;
      edges.push({ x1: 3, x2: W - 3, y: innerTop + range * t + jitter });
    }
    return edges;
  }, [thickness.pageLayers, W, H]);

  const goldPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(3, 9); p.lineTo(W - 3, 9);
    p.moveTo(3, H - 9); p.lineTo(W - 3, H - 9);
    return p;
  }, [W, H]);

  // Yaslanma transform — pivot sol-alt köşede olacak şekilde translate ile düzeltiyoruz.
  // RN transform-origin yok; rotate sonrası tabanı yerinde tutmak için manuel çeviri.
  const leanTransform = useMemo(() => {
    if (lean === 0) return undefined;
    const rad = (lean * Math.PI) / 180;
    // Pivot sol-alt köşe → sin(rad) * H kadar translateX, cos(rad)-1 kadar translateY
    // Default rotation pivot = merkez. Sol-alt'a alma: önce translate(-W/2, H/2), rotate, sonra geri.
    return [
      { translateX: -W / 2 },
      { translateY: H / 2 },
      { rotate: `${lean}deg` },
      { translateX: W / 2 },
      { translateY: -H / 2 },
    ];
  }, [lean, W, H]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.shadowWrapper,
        { width: W, height: H },
        leanTransform ? { transform: leanTransform } : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.body, { backgroundColor: theme.spine, borderRadius: 7 }]}>

        <Canvas style={[styles.canvas, { width: W, height: H }]}>

          {/* 1. Ana yatay gradient */}
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient
              start={vec(0, 0)} end={vec(W, 0)}
              colors={[
                'rgba(255,255,255,0.24)',
                'rgba(255,255,255,0.06)',
                'rgba(0,0,0,0.08)',
                'rgba(0,0,0,0.28)',
              ]}
              positions={[0, 0.35, 0.70, 1]}
            />
          </Rect>

          {/* 2. Dikey fade */}
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient
              start={vec(0, 0)} end={vec(0, H)}
              colors={[
                'rgba(0,0,0,0.20)',
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.18)',
              ]}
              positions={[0, 0.18, 0.82, 1]}
            />
          </Rect>

          {/* 3. Sayfa kenarı katmanları (slim=1, thick=3) */}
          {pageEdges?.map((e, i) => (
            <Path
              key={i}
              path={(() => {
                const p = Skia.Path.Make();
                p.moveTo(e.x1, e.y);
                p.lineTo(e.x2, e.y);
                return p;
              })()}
              color="rgba(0,0,0,0.22)"
              style="stroke"
              strokeWidth={thickness.id === 'thick' ? 0.9 : 0.6}
            />
          ))}

          {/* Thick için ekstra: küçük sayfa-kenarı blokları (kitap kalınlığı vurgusu) */}
          {thickness.id === 'thick' && (
            <Group>
              {[0.30, 0.50, 0.70].map((ty, i) => (
                <Rect
                  key={`pb-${i}`}
                  x={W - 5}
                  y={H * ty - 1.5}
                  width={4}
                  height={3}
                  color="rgba(255,240,210,0.18)"
                />
              ))}
            </Group>
          )}

          {/* 4. Altın emboss bantlar */}
          <Group>
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.moveTo(3, 8);     p.lineTo(W - 3, 8);
                p.moveTo(3, H - 10); p.lineTo(W - 3, H - 10);
                return p;
              })()}
              color="rgba(255,242,200,0.50)"
              style="stroke" strokeWidth={0.9}
            />
            <Path path={goldPath} color="rgba(220,180,90,0.75)" style="stroke" strokeWidth={1.1} />
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.moveTo(3, 10);    p.lineTo(W - 3, 10);
                p.moveTo(3, H - 8); p.lineTo(W - 3, H - 8);
                return p;
              })()}
              color="rgba(0,0,0,0.28)"
              style="stroke" strokeWidth={0.9}
            />
          </Group>

          {/* 5. Pixar puffy radial highlight */}
          <RoundedRect x={0} y={0} width={W} height={H} r={7} opacity={0.65}>
            <RadialGradient
              c={vec(W * 0.25, H * 0.14)}
              r={W * 1.5}
              colors={['rgba(255,248,225,0.82)', 'rgba(255,248,225,0)']}
              positions={[0, 0.45]}
            />
          </RoundedRect>

          {/* 6. Sol rim light */}
          <Rect x={0} y={6} width={3.5} height={H - 12} opacity={0.75}>
            <LinearGradient
              start={vec(0, 0)} end={vec(3.5, 0)}
              colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0)']}
            />
          </Rect>

          {/* 7. Sağ kenar gölge — kalınlığa göre opacity */}
          <Rect x={W - 4} y={6} width={4} height={H - 12} opacity={thickness.rightShadowAlpha}>
            <LinearGradient
              start={vec(0, 0)} end={vec(4, 0)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            />
          </Rect>

          {/* 8. Alt gölge */}
          <Rect x={2} y={H - 14} width={W - 4} height={14}>
            <LinearGradient
              start={vec(0, 0)} end={vec(0, 14)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)']}
            />
          </Rect>

          {/* 9. İç emboss çerçeve */}
          <RoundedRect
            x={1.5} y={1.5} width={W - 3} height={H - 3} r={6}
            color="rgba(255,255,255,0.10)"
            style="stroke" strokeWidth={0.9}
          />

        </Canvas>

        <View style={[styles.topBand, { backgroundColor: theme.cover }]} />

        {notebook.locked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={7} color="rgba(255,255,255,0.95)" />
          </View>
        )}

        <View style={styles.letterStack}>
          {letters.map((ch, i) => (
            <Text
              key={i}
              style={[
                styles.letter,
                isSingleBigLetter && styles.letterBig,
              ]}
            >
              {ch}
            </Text>
          ))}
        </View>

        <View style={[styles.bottomBand, { backgroundColor: theme.cover }]} />

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#1A0A00',
    shadowOffset: { width: 3, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 14,
  },
  pressed: {
    transform: [{ translateY: -6 }, { scale: 1.04 }],
    shadowOffset: { width: 3, height: 14 },
    shadowOpacity: 0.65,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.40)',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  topBand: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 8,
    opacity: 0.85,
  },
  bottomBand: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 8,
    opacity: 0.85,
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  letterStack: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    paddingHorizontal: 2,
  },
  letter: {
    color: 'rgba(255,248,220,0.97)',
    fontSize: 12,
    fontFamily: 'Caveat_700Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 13,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 2.5,
  },
  letterBig: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0,
  },
});
