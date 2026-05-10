import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display';
import * as Haptics from 'expo-haptics';
import {
  type Notebook,
  type Silhouette,
  MAX_CUSTOM_NOTEBOOKS,
  getTheme,
} from './notebooks';
import {
  SystemNotebookSpine,
  type SpineColors,
  JOURNAL_COLORS,
  SECRET_COLORS,
} from './system-notebook-spine';

/**
 * Journal kitaplık ekranı.
 *
 * Mimari:
 *   - Background: scene.png (1320×2868, Kling AI), height-fit, sol-anchor.
 *   - Defter overlay'leri: görsel-piksel uzayında konumlanır.
 *
 * Raf yerleşimi (yeni sahne, doğrulanmış piksel ölçümleri):
 *   - Raf 1 (en üst, saksılar): defter konmaz.
 *   - Raf 2 (orta, boş): custom defterler — sonraki adımda.
 *   - Raf 3 (alt, boş): 2 system defter (Journal + Secret), sağa yaslı.
 *
 * Tüm pozisyon hesabı görsel piksel uzayında (1320×2868). Ekran-uzayına
 * dönüşüm: pt = px × (SCREEN_H / 2868). Cihaza-bağımsız.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Görsel ölçek (height-fit, sol-anchor) ────────────────────────────────────
const IMG_W = 1320;
const IMG_H = 2868;
const SCALE = SCREEN_H / IMG_H;
const RENDER_IMG_W = IMG_W * SCALE;

/** Görsel-piksel → ekran-pt */
const px = (n: number) => n * SCALE;

// ─── Doğrulanmış raf koordinatları (görsel piksel uzayı) ──────────────────────
// Ölçüm: scene.png üzerinde Python+numpy ahşap-piksel detection.
// Yan destekler: sol tahta x=46..83, sağ tahta x=697..731.

const SHELF_INNER_LEFT  = 84;   // sol yan tahtanın iç kenarı
const SHELF_INNER_RIGHT = 696;  // sağ yan tahtanın iç kenarı
const SHELF_INNER_W_PX  = SHELF_INNER_RIGHT - SHELF_INNER_LEFT; // 612

// Defter tabanı = raf tahtasının üst yüzeyi
const SHELF_2_FLOOR_PX = 1576; // raf 2 (orta, boş)
const SHELF_3_FLOOR_PX = 1972; // raf 3 (alt, boş)

// Raf iç yükseklikleri (defter yüksekliği referansı için)
const SHELF_2_INNER_H_PX = 379; // 1576 - 1197 (raf 1 alt yüzeyi tavan)
const SHELF_3_INNER_H_PX = 352; // 1972 - 1620 (raf 2 alt yüzeyi tavan)

// Defterler PNG'deki rafın tahta üst yüzeyinin tam ön kenarına basar.
// Raf 2 ve raf 3'ün ön kenar Y değerleri farklı (ölçüm hatası):
//   raf 3 → SHELF_3_FLOOR_PX + 8 doğru oturuyor
//   raf 2 → SHELF_2_FLOOR_PX değeri rafın ön kenarından aşağıda kalıyor;
//           defterin rafın üstüne oturması için negatif ofset (yukarı kaydır).
const BOTTOM_OFFSET_PX_R2 = 0;
const BOTTOM_OFFSET_PX_R3 = 20;

// ─── Slot hesabı — sağa yaslı, sıralı kilit ──────────────────────────────────

interface Slot {
  /** Ekran-uzayı pt değerleri */
  leftPt: number;
  bottomPt: number;
  widthPt: number;
  heightPt: number;
  /** Yaslanma derecesi */
  leanDeg: number;
  /** Bu slotun üstündeki defter (varsa). */
  notebook: Notebook | null;
  /** Bu slot şu an interaktif mi? Sıradaki ilk boş slot interaktif olur. */
  isActive: boolean;
  /** Slot index (debug). */
  index: number;
}

/**
 * Silüet başına sabit boyut oranları. Custom defter eklenirken hangi silüet
 * seçildiyse o boyutta render edilir → çeşitlilik silüetten gelir.
 */
const SILHOUETTE_DIMS: Record<string, { widthRatio: number; heightRatio: number }> = {
  classic: { widthRatio: 0.20, heightRatio: 0.74 },
  arched:  { widthRatio: 0.18, heightRatio: 0.80 },
  pointed: { widthRatio: 0.19, heightRatio: 0.78 },
};

/**
 * Raf 2 — 3 custom slot, SAĞA yaslı, sıralı kilit, kademeli yaslanma.
 *
 * Yerleşim sırası (sağdan sola): slot[0] en sağda → slot[1] ortada → slot[2] en solda.
 * `customs[0]` en sağa düşer; ilk eklenen kitap sağ çıtaya yaslı durur.
 *
 * Sıralı kilit: kullanıcı önce slot[0]'ı (en sağdakini) doldurur. Sıradaki "+"
 * sadece `customs.length` indeksli slotta görünür. Sebep: en sağdaki açılmadan
 * orta/sol slotlar açılırsa, kitap kendi başına havada duruyor gibi görünür —
 * sağ çıta dayanak.
 *
 * Yaslanma kademesi (pivot sol-alt köşe):
 *   - slot[0] (en sağ): 0° dik, sağ çıtaya değer.
 *   - slot[1]: -3°, sağdaki komşusuna yaslanır.
 *   - slot[2] (en sol): -6°, ortadakine yaslanır.
 */
function computeShelf2Slots(customs: Notebook[]): Slot[] {
  const slots: Slot[] = [];

  const PAD_RIGHT_PX = 55;
  const GAP_PX = 0; // yan yana, kitaplar birbirine değer

  // Kademeli yaslanma — index 0 en sağda, dik; sola doğru artar.
  // Pozitif açı: defterin üstü sağa yatar → soldaki kitap sağdaki komşusuna yaslanır.
  const LEAN_BY_INDEX = [0, 3, 6];

  // Boş slot için varsayılan (henüz silüet seçilmedi → klasik boyut)
  const defaultWidthPx  = SHELF_INNER_W_PX * SILHOUETTE_DIMS.classic.widthRatio;
  const defaultHeightPx = SHELF_2_INNER_H_PX * SILHOUETTE_DIMS.classic.heightRatio;

  const widthPxFor = (n: Notebook | null): number => {
    if (!n) return defaultWidthPx;
    const dims = SILHOUETTE_DIMS[n.silhouette] ?? SILHOUETTE_DIMS.classic;
    return SHELF_INNER_W_PX * dims.widthRatio;
  };
  const heightPxFor = (n: Notebook | null): number => {
    if (!n) return defaultHeightPx;
    const dims = SILHOUETTE_DIMS[n.silhouette] ?? SILHOUETTE_DIMS.classic;
    return SHELF_2_INNER_H_PX * dims.heightRatio;
  };

  // Sıralı kilit: ilk boş slot = customs.length (sıradaki dolacak yer)
  const firstEmptyIdx = customs.length;

  // Sağa yaslama: x cursor sağdan sola doğru ilerler.
  let cursorRightPx = SHELF_INNER_RIGHT - PAD_RIGHT_PX;

  for (let i = 0; i < MAX_CUSTOM_NOTEBOOKS; i++) {
    const notebook = i < customs.length ? customs[i] : null;
    const widthPx  = widthPxFor(notebook);
    const heightPx = heightPxFor(notebook);
    const leftPx   = cursorRightPx - widthPx;

    slots.push({
      leftPt: px(leftPx),
      bottomPt: px(SHELF_2_FLOOR_PX + BOTTOM_OFFSET_PX_R2),
      widthPt: px(widthPx),
      heightPt: px(heightPx),
      leanDeg: LEAN_BY_INDEX[i] ?? 0,
      notebook,
      isActive: i === firstEmptyIdx,
      index: i,
    });

    cursorRightPx -= widthPx + GAP_PX;
  }

  return slots;
}

/**
 * Raf 3 — 2 system defter, sağa yaslı.
 * Sıra (sağdan sola): [0]=Secret en sağ (dik 0°), [1]=Journal solunda (+5° sağa yaslı).
 *
 * Yaslanma: Journal sağdaki Secret'a doğru sağa yatar (üst-sağ taraf
 * Secret'a değer). Pivot alt-sol köşe (Journal'ın sol-altı raf zeminine sabit).
 *
 * Referans: cartoonbooks-1.png — defterler dikey ince şeritler.
 *  - Secret: ince + uzun (Love Story tarzı, kemerli üst).
 *  - Journal: kalın + biraz daha kısa (Encyclopedia tarzı, düz üst).
 *
 * Defter rafa basar: bottomPt = SHELF_3_FLOOR_PX + 2 (PNG raf kalınlığının
 * ön yüzeyine; tam tahta üstüne koyunca defterin altı tahtanın gölgesinde
 * kalıyordu).
 */
function computeShelf3Slots(systems: Notebook[]): Slot[] {
  const slots: Slot[] = [];
  // Defterler sağa yaslı, yan yana birbirine değecek şekilde.
  const PAD_RIGHT_PX = 55;
  const GAP_PX = 0; // yan yana, gap yok

  const SPINE_DIMS: Record<string, { widthRatio: number; heightRatio: number; leanDeg: number }> = {
    // Secret: ince + uzun, dik
    private:  { widthRatio: 0.18, heightRatio: 0.84, leanDeg: 0 },
    // Journal: biraz daha kalın + biraz daha kısa, dik (referansta dik kitaplar)
    standard: { widthRatio: 0.22, heightRatio: 0.86, leanDeg: 0 },
  };

  let cursorRightPx = SHELF_INNER_RIGHT - PAD_RIGHT_PX;

  // Defter bazında ek dikey offset (Journal Secret'tan biraz daha aşağıda dursun)
  const PER_TYPE_BOTTOM_NUDGE: Record<string, number> = {
    standard: 8, // Journal — biraz aşağı (görsel-px)
    private:  0, // Secret — sabit
  };

  for (let i = 0; i < systems.length; i++) {
    const notebook = systems[i];
    const dims = SPINE_DIMS[notebook.type] ?? SPINE_DIMS.standard;
    const widthPx  = SHELF_INNER_W_PX * dims.widthRatio;
    const heightPx = SHELF_3_INNER_H_PX * dims.heightRatio;
    const leftPx   = cursorRightPx - widthPx;
    const nudge    = PER_TYPE_BOTTOM_NUDGE[notebook.type] ?? 0;

    slots.push({
      leftPt:   px(leftPx),
      bottomPt: px(SHELF_3_FLOOR_PX + BOTTOM_OFFSET_PX_R3 + nudge),
      widthPt:  px(widthPx),
      heightPt: px(heightPx),
      leanDeg:  dims.leanDeg,
      notebook,
      isActive: false,
      index: i,
    });

    cursorRightPx -= widthPx + GAP_PX;
  }

  return slots;
}

// ─── Sahnedeki uyuyan kedinin Zzz animasyonu ────────────────────────────────
//
// 3 kademeli "Z" — kafanın üstünden yukarı süzülür, küçükten büyüğe büyür ve
// fade-out olur. Her Z bir öncekinden ~700ms gecikmeli başlar (loop), klasik
// comic Zzz hissi.
//
// Konum: scene.png (1320×2868) içinde kedinin kafa Y'si ~2300, kafa-merkez X
// ~480. Z'ler kafanın hemen üstünden başlayıp yukarı doğru süzülür.
function CatZzz({ leftPt, topPt }: { leftPt: number; topPt: number }) {
  const ZS = [0, 1, 2];
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: leftPt, top: topPt }}
    >
      {ZS.map((i) => (
        <ZLetter key={i} delayMs={i * 700} />
      ))}
    </View>
  );
}

function ZLetter({ delayMs }: { delayMs: number }) {
  // Tek bir progress değeri — 0 → 1 arasında dönüp dönüp tekrar.
  // 0 = başlangıç (kafa üstü, küçük, görünmez)
  // 0.15 = peak opacity (büyür, görünür olur)
  // 1 = en üstte, fade-out tamamlanmış
  // Sonra tekrar 0'a sıçrar (instant — Animated.loop iterationCount default).
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const runOnce = () => {
      if (cancelled) return;
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true,
      }).start(() => {
        if (!cancelled) runOnce();
      });
    };
    const t = setTimeout(runOnce, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -32],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18], // sağa doğru süzülür
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.2],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        fontSize: 18,
        fontWeight: '700',
        color: 'rgba(20, 18, 28, 0.95)', // kedinin siyahı (hafif mor tonlu)
        textShadowColor: 'rgba(255, 244, 214, 0.4)', // krem soft halo — duvarda kaybolmasın
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      Z
    </Animated.Text>
  );
}

// ─── Stagger animasyon (RN core Animated) ────────────────────────────────────
function SpineAnimated({
  delayMs,
  children,
}: {
  delayMs: number;
  children: React.ReactNode;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        delay: delayMs,
        damping: 14,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: delayMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      {children}
    </Animated.View>
  );
}

// ─── Boş slot silüeti — defter şeklinde dashed kontur + ortada "+" butonu ──
//
// Aktif slot (sıradaki ilk boş): opacity yüksek, basılabilir, "+" görünür.
// Pasif slot (kilitli): opacity düşük, basılamaz, "+" yok.
// Silüet rafın ahşap tonuyla harmonik krem-bej; kesik çizgi (dashed) kontur.
function EmptySpine({
  leftPt,
  bottomPt,
  widthPt,
  heightPt,
  leanDeg,
  active,
  onPress,
}: {
  leftPt: number;
  bottomPt: number;
  widthPt: number;
  heightPt: number;
  leanDeg: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: leftPt,
        top: bottomPt - heightPt,
        width: widthPt,
        height: heightPt,
        alignItems: 'center',
        justifyContent: 'center',
        // Yaslanma — pivot sağ-alt köşe (defter, sağdaki komşusuna yaslanır;
        // alt-sağ köşe raf zeminine sabit, üst-sol yukarı kalkar).
        transform: [{ rotate: `${leanDeg}deg` }],
        transformOrigin: 'right bottom' as any,
        // Dashed kontur ve fill — silüet görünümü
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: active
          ? 'rgba(255, 244, 214, 0.55)'
          : 'rgba(255, 244, 214, 0.20)',
        backgroundColor: active
          ? 'rgba(60, 42, 30, 0.18)'
          : 'rgba(60, 42, 30, 0.08)',
        borderRadius: 3,
      }}
    >
      {/* "+" butonu — silüetin ortasında, sadece aktif slotta */}
      {active && (
        <Pressable onPress={onPress} hitSlop={12} style={styles.addCircle}>
          <Ionicons name="add" size={14} color="rgba(255, 244, 214, 0.95)" />
        </Pressable>
      )}
    </View>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export function LibraryShelf({
  notebooks,
  onSelectNotebook,
  onAddNotebook,
  onLongPressNotebook,
}: {
  notebooks: Notebook[];
  onSelectNotebook: (notebook: Notebook) => void;
  onAddNotebook: () => void;
  onLongPressNotebook?: (notebook: Notebook) => void;
}) {
  // Defterleri ayır: sistem (Günlük + Secret) raf 3'e, custom raf 2'ye.
  const systems = useMemo(
    () => notebooks.filter((n) => n.type === 'standard' || n.type === 'private'),
    [notebooks],
  );
  const customs = useMemo(
    () => notebooks.filter((n) => n.type === 'custom').slice(0, MAX_CUSTOM_NOTEBOOKS),
    [notebooks],
  );

  // System sırası (sağdan sola): Journal en sağda → Secret onun solunda.
  // computeShelf3Slots index 0'ı en sağa koyar → ilk eleman Journal olmalı.
  const systemsSorted = useMemo(() => {
    const standard = systems.find((n) => n.type === 'standard');  // Journal
    const priv     = systems.find((n) => n.type === 'private');   // Secret
    return [standard, priv].filter(Boolean) as Notebook[];
  }, [systems]);

  const shelf2Slots = useMemo(() => computeShelf2Slots(customs), [customs]);
  const shelf3Slots = useMemo(() => computeShelf3Slots(systemsSorted), [systemsSorted]);

  // Yeni sahne — bu adımda sadece raf 3 (2 system defter) render edilir.
  // Raf 2 (custom) sonraki adıma kadar kapalı.
  const SHOW_SHELF3 = true;
  const SHOW_SHELF2 = true;
  // System defter sırtı fontları: Fredoka (Secret S için), Playfair (Journal J için).
  const [fontsLoaded] = useFonts({ Fredoka_700Bold, PlayfairDisplay_900Black });

  return (
    <View style={styles.container}>
      <View style={styles.imgContainer} pointerEvents="none">
        <Image
          source={require('../../../assets/journal/scene.png')}
          style={{
            width: RENDER_IMG_W,
            height: SCREEN_H,
            position: 'absolute',
            left: 0,
            top: 0,
          }}
          contentFit="fill"
          cachePolicy="memory-disk"
          priority="high"
        />
      </View>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Sahnedeki uyuyan kedi için Zzz animasyonu —
            kafa üst Y ≈ 2243, kafa-merkez X ≈ 490 (görsel-piksel uzayı). */}
        <CatZzz leftPt={px(545)} topPt={px(2210)} />

        {/* Raf 2 — 3 custom slot, sola yaslı, sıralı kilit */}
        {SHOW_SHELF2 && fontsLoaded && shelf2Slots.map((slot, i) => {
          const key = slot.notebook?.id ?? `r2-empty-${i}`;
          const delay = i * 80;

          if (slot.notebook) {
            const theme = getTheme(slot.notebook.themeId);
            const customColors: SpineColors = {
              spine:     theme.spine,
              spineDeep: theme.spineDeep,
              edgeLine:  theme.detail,
              frame:     theme.detail,
              monogram:  theme.detail,
            };
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onSelectNotebook(slot.notebook!);
                }}
                onLongPress={
                  onLongPressNotebook
                    ? () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        onLongPressNotebook(slot.notebook!);
                      }
                    : undefined
                }
                style={{
                  position: 'absolute',
                  left:   slot.leftPt,
                  top:    slot.bottomPt - slot.heightPt,
                  width:  slot.widthPt,
                  height: slot.heightPt,
                }}
              >
                <SpineAnimated delayMs={delay}>
                  <SystemNotebookSpine
                    silhouette={slot.notebook.silhouette}
                    title={slot.notebook.name}
                    width={slot.widthPt}
                    height={slot.heightPt}
                    colors={customColors}
                    lean={slot.leanDeg}
                  />
                </SpineAnimated>
              </Pressable>
            );
          }

          // Boş slot → silüet (aktifse "+" görünür ve basılabilir, kilitli ise sönük)
          return (
            <EmptySpine
              key={key}
              leftPt={slot.leftPt}
              bottomPt={slot.bottomPt}
              widthPt={slot.widthPt}
              heightPt={slot.heightPt}
              leanDeg={slot.leanDeg}
              active={slot.isActive}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddNotebook();
              }}
            />
          );
        })}

        {/* Raf 3 — 2 system defter (Journal + Secret) */}
        {SHOW_SHELF3 && fontsLoaded && shelf3Slots.map((slot, i) => {
          const notebook = slot.notebook!;
          const isSecret = notebook.type === 'private';
          const colors = isSecret ? SECRET_COLORS : JOURNAL_COLORS;
          const silhouette: Silhouette = isSecret ? 'arched' : 'classic';
          const delay = i * 100;

          return (
            <Pressable
              key={notebook.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelectNotebook(notebook);
              }}
              onLongPress={
                onLongPressNotebook
                  ? () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      onLongPressNotebook(notebook);
                    }
                  : undefined
              }
              style={{
                position: 'absolute',
                left:   slot.leftPt,
                top:    slot.bottomPt - slot.heightPt,
                width:  slot.widthPt,
                height: slot.heightPt,
              }}
            >
              <SpineAnimated delayMs={delay}>
                <SystemNotebookSpine
                  silhouette={silhouette}
                  title={notebook.name}
                  width={slot.widthPt}
                  height={slot.heightPt}
                  colors={colors}
                  showLock={isSecret}
                  lean={slot.leanDeg}
                />
              </SpineAnimated>
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#7B6E80',
    overflow: 'hidden',
  },
  imgContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  addCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(40, 28, 50, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 214, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
