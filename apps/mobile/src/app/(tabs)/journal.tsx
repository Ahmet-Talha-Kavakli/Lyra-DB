import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { useUser } from '@clerk/expo';
import { makeImageFromView, type SkImage } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withRepeat, withSequence,
  runOnJS, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { PageCurl } from '../../features/journal/page-curl';
import { LibraryShelf } from '../../features/journal/library-shelf';
import { THEMES, isDarkTheme, type Notebook, type ThemeId, type Theme } from '../../features/journal/notebooks';
import { useNotebooks } from '../../features/journal/use-notebooks';
import { showAddNotebookFlow, showNotebookContextMenu, showDeleteNotebookFlow } from '../../features/journal/notebook-flows';
import { openSecretNotebook } from '../../features/journal/secret-notebook-flow';
import { useVoiceInput } from '../../features/journal/use-voice-input';
import { VoiceMicButton } from '../../features/journal/voice-mic-button';
import { LyraChatButton } from '../../features/journal/lyra-chat-button';
import { LyraChatModal } from '../../features/journal/lyra-chat-modal';
import type { JournalChatContext } from '../../features/journal/use-journal-chat';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PAGE_W = SCREEN_W - 32;
const PAGE_H = PAGE_W * 1.42;
const CAT_SIZE = PAGE_W * 0.30;

// Sahne (scene.png) 1320×2868; LibraryShelf'teki px() ile aynı scale.
// Lyra butonunu sahnedeki lamba abajurunun üstüne yerleştirmek için kullanılır.
const SCENE_SCALE = SCREEN_H / 2868;
const scenePx = (n: number) => n * SCENE_SCALE;
const LYRA_BTN_SIZE = 38;
// Lambanın abajuru görsel-px uzayda ~ (cx 870, top 1990).
// Buton'u abajurun hemen üstüne, halka olarak konumlandır.
const LYRA_SHELF_LEFT = scenePx(926) - LYRA_BTN_SIZE / 2;
const LYRA_SHELF_TOP  = scenePx(1990) - LYRA_BTN_SIZE - 8;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  const weekday = d.toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();
  const full = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return { weekday, full };
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function CoverPage({ theme }: { theme: Theme }) {
  // İllüstrasyon yavaş yavaş yukarı-aşağı süzülür — havada uçuyormuş hissi.
  // 0 → -7 → 0 (yumuşak ease), 3 saniyelik tek döngü, sonsuz tekrar.
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, // sonsuz
      false,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={[styles.page, { backgroundColor: theme.cover }]}>
      {/* Dikiş efekti */}
      <View style={styles.stitchLine} />
      {/* Izgara doku */}
      <View style={styles.gridOverlay} />
      {/* Emboss border */}
      <View style={[styles.embossBorder, { borderColor: 'rgba(255,255,255,0.25)' }]} />

      <View style={styles.coverContent}>
        <Animated.Image
          source={require('../../../assets/journal/magical-writing.png')}
          style={[styles.coverIllustration, floatStyle]}
          resizeMode="contain"
        />
        <Text style={[styles.coverTitle, { color: theme.text }]}>Günlüğüm</Text>
        <Text style={[styles.coverSub, { color: theme.textSoft }]}>Lyra ile birlikte</Text>
      </View>
    </View>
  );
}

// ─── Diary Page ───────────────────────────────────────────────────────────────
// Tek bir çizgi yüksekliği (line + marginBottom). textInput lineHeight ile eşleşmeli.
const LINE_SPACING = 30;
// Sayfa numarasının üstünde bırakılacak boşluk (~1cm).
const BOTTOM_RESERVE = 38;

function DiaryPage({
  theme,
  date,
  content,
  pageNum,
  totalPages,
  isToday,
  onChangeText,
}: {
  theme: Theme;
  date: string;
  content: string;
  pageNum: number;
  totalPages: number;
  isToday: boolean;
  onChangeText: (text: string) => void;
}) {
  const { weekday } = formatDate(date);
  const [containerH, setContainerH] = useState(0);
  const lineCount = containerH > 0
    ? Math.max(1, Math.floor((containerH - BOTTOM_RESERVE) / LINE_SPACING))
    : 0;

  return (
    <View style={[styles.page, { backgroundColor: theme.page }]}>
      {/* Kırmızı margin çizgisi */}
      <View style={[styles.marginLine, { backgroundColor: theme.accent + '60' }]} />

      {/* Bugün ribbon */}
      {isToday && (
        <View style={[styles.ribbon, { backgroundColor: theme.accent }]} />
      )}

      {/* Tarih header */}
      <View style={styles.dateHeader}>
        <Text style={[styles.weekdayText, { color: theme.accent, fontFamily: 'Caveat_700Bold' }]}>
          {weekday}
        </Text>
        {/* Dekoratif ayırıcı — yıldızlı satır direk yazı satırının üstünde olacak */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
          <Text style={[styles.dividerIcon, { color: theme.accent }]}>✦</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
        </View>
      </View>

      {/* Çizgili alan — sayfanın altına ~1cm kalana kadar otomatik dolar.
          Her ruled-line text satırının ALTINDA (lineHeight kadar offset ile) çizilir,
          böylece yazı tam çizginin üstüne oturur. */}
      <View
        style={styles.linesContainer}
        onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <View
            key={i}
            style={[styles.line, { backgroundColor: theme.line, marginTop: LINE_SPACING - 1 }]}
          />
        ))}
        <TextInput
          style={[styles.textInput, { color: theme.text, fontFamily: 'Caveat_400Regular' }]}
          multiline
          placeholder="Bugün neler hissettin? Aklında neler var..."
          placeholderTextColor={theme.accent + '70'}
          value={content}
          onChangeText={onChangeText}
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </View>

      {/* Sayfa numarası */}
      <Text style={[styles.pageNum, { color: theme.accent + '80', fontFamily: 'Caveat_400Regular' }]}>
        {pageNum} / {totalPages}
      </Text>
    </View>
  );
}

// ─── Theme Picker ─────────────────────────────────────────────────────────────
function ThemePicker({
  current,
  onSelect,
}: {
  current: ThemeId;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.themeRow}
      style={styles.themeScroll}
    >
      {THEMES.map((t) => (
        <Pressable key={t.id} onPress={() => onSelect(t.id)} style={styles.themeBtn}>
          <View style={[
            styles.themeCircle,
            current === t.id && styles.themeCircleSelected,
          ]}>
            <View style={[styles.themeHalfLeft,  { backgroundColor: t.cover }]} />
            <View style={[styles.themeHalfRight, { backgroundColor: t.page  }]} />
          </View>
          <Text style={[styles.themeLabel, current === t.id && { color: '#F5F3FF' }]}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Notebook View ────────────────────────────────────────────────────────────
// Tek bir defterin içeriğini gösteren UI. Eskiden JournalScreen idi;
// şimdi LibraryShelf bir defter seçince render olur.
function NotebookView({
  notebook,
  onBack,
  onDelete,
}: {
  notebook: Notebook;
  onBack: () => void;
  onDelete?: () => void;
}) {
  const { user } = useUser();
  const [fontsLoaded] = useFonts({ Caveat_400Regular, Caveat_700Bold, DancingScript_700Bold });

  // Tema notebook'tan gelir; kullanıcı theme picker ile değiştirebilir (local).
  // Faz 4'te değişiklik backend'e kaydedilecek.
  const [themeId, setThemeId] = useState<ThemeId>(notebook.themeId);
  const theme = THEMES.find(t => t.id === themeId)!;
  // Kedi sadece "Günlük" (standard) defterinde görünsün — kullanıcı isteği.
  const showCat = notebook.type === 'standard';

  // Entries: map of date → content
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = cover, 1+ = pages
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Build sorted date list (today always present)
  const today = todayKey();
  const dates = Array.from(new Set([...Object.keys(entries), today])).sort();

  const totalPages = dates.length;

  // Page-curl snapshot/transition state
  const [transition, setTransition] = useState<{
    oldImage: SkImage;
    newImage: SkImage;
    direction: 1 | -1;
    targetIndex: number;
  } | null>(null);
  // While targetIndex is set (and we're not yet in transition), the off-screen
  // target page is mounted so we can snapshot it.
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);

  // Refs for snapshot. currentPageRef wraps the visible page's view; targetPageRef
  // wraps the off-screen target page that mounts briefly during a transition.
  const currentPageRef = useRef<View>(null);
  const targetPageRef = useRef<View>(null);

  // Curl progress (0 = düz, 1 = tamamen çevrilmiş). Hem buton hem gesture sürer.
  const curlProgress = useSharedValue(0);
  // Reentrancy guard: animasyon başladıktan sonra yeni animasyon tetiklenmesin.
  const isAnimating = useRef(false);
  // Gesture başlamadan önce hangi tarafa kıvrılacak; buton da bunu set eder.
  const gestureDirection = useSharedValue<1 | -1>(1);
  // Pan gesture aktif mi (köşeden başladıysa true)
  const gestureActive = useSharedValue(false);

  // Debounce save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveEntry = useCallback(async (date: string, content: string) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/journal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': user.id },
        body: JSON.stringify({ notebookId: notebook.id, date, content }),
      });
    } finally {
      setSaving(false);
    }
  }, [user?.id, notebook.id]);

  const handleTextChange = useCallback((date: string, text: string) => {
    setEntries(prev => ({ ...prev, [date]: text }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveEntry(date, text), 2500);
  }, [saveEntry]);

  // Voice input → görünür tarihin sayfasına ekler.
  // Final transkript geldikçe mevcut metnin sonuna boşluk ile append edilir.
  // Cover sayfasındayken (currentIndex === 0) ses girdisi yok sayılır.
  const appendVoiceText = useCallback((spoken: string) => {
    if (currentIndex === 0) return;
    const currentDate = dates[currentIndex - 1];
    if (!currentDate) return;
    setEntries(prev => {
      const existing = prev[currentDate] ?? '';
      const sep = existing.length > 0 && !existing.endsWith(' ') && !existing.endsWith('\n') ? ' ' : '';
      const next = existing + sep + spoken;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveEntry(currentDate, next), 1500);
      return { ...prev, [currentDate]: next };
    });
  }, [currentIndex, dates, saveEntry]);

  const voice = useVoiceInput({ onFinalResult: appendVoiceText });

  // Load entries on mount — sadece bu defterin entries'i, izole.
  // notebook.id değişirse (kullanıcı başka bir defter açtıysa) yeniden yükle.
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_URL}/journal?notebookId=${encodeURIComponent(notebook.id)}`, {
      headers: { 'x-clerk-user-id': user.id },
    })
      .then(r => r.json())
      .then((data: { entryDate: string; content: string }[]) => {
        const map: Record<string, string> = {};
        data.forEach(e => {
          // Backend `@db.Date` ISO döndürür ("2026-05-03T00:00:00.000Z");
          // bizim key formatımız YYYY-MM-DD (todayKey ile aynı).
          const dateKey = e.entryDate.split('T')[0];
          map[dateKey] = e.content;
        });
        setEntries(map);
        const allDates = Array.from(new Set([...Object.keys(map), today])).sort();
        const todayIdx = allDates.indexOf(today);
        setCurrentIndex(todayIdx + 1); // +1 for cover
      })
      .catch(() => {
        setCurrentIndex(dates.indexOf(today) + 1);
      });
  }, [user?.id, notebook.id]);

  // 2 frame bekleyip snapshot al — view'in layout/commit'i tamamlanmış olmalı.
  // Tek rAF bazen mount-sonrası ilk paint öncesi tetiklenebiliyor; double rAF güvenli.
  const snapshotAfterFrame = useCallback(async (ref: React.RefObject<View | null>): Promise<SkImage | null> => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          if (!ref.current) { resolve(null); return; }
          try {
            const img = await makeImageFromView(ref);
            resolve(img);
          } catch {
            resolve(null);
          }
        });
      });
    });
  }, []);

  // Animasyon bitti → currentIndex'i hedefe çek, overlay kapat
  const finishTransition = useCallback((targetIndex: number) => {
    setCurrentIndex(targetIndex);
    setTransition(null);
    setPendingTarget(null);
    curlProgress.value = 0;
    isAnimating.current = false;
  }, [curlProgress]);

  // Animasyon iptal edildi (gesture yarıda bırakıldı) → eski hale dön, currentIndex değişmez
  const cancelTransition = useCallback(() => {
    setTransition(null);
    setPendingTarget(null);
    curlProgress.value = 0;
    isAnimating.current = false;
  }, [curlProgress]);

  // Snapshot al + transition state'i hazırla. Gesture ya da buton tetikler.
  // Geri dönüş: snapshot başarılıysa transition başlatılmıştır; aksi halde false.
  const beginTransition = useCallback(async (nextIndex: number, direction: 1 | -1): Promise<boolean> => {
    if (isAnimating.current) return false;
    if (nextIndex < 0 || nextIndex > totalPages) return false;
    if (nextIndex === currentIndex) return false;
    isAnimating.current = true;

    setPendingTarget(nextIndex);
    curlProgress.value = 0;
    gestureDirection.value = direction;

    const oldImage = await snapshotAfterFrame(currentPageRef);
    const newImage = await snapshotAfterFrame(targetPageRef);

    if (!oldImage || !newImage) {
      setPendingTarget(null);
      setCurrentIndex(nextIndex);
      isAnimating.current = false;
      return false;
    }

    setTransition({ oldImage, newImage, direction, targetIndex: nextIndex });
    return true;
  }, [currentIndex, totalPages, snapshotAfterFrame, curlProgress, gestureDirection]);

  // Buton: snapshot al → progress'i 0→1 timing ile sür → bittiğinde finish
  const goTo = useCallback(async (nextIndex: number) => {
    const direction: 1 | -1 = nextIndex > currentIndex ? 1 : -1;
    const ok = await beginTransition(nextIndex, direction);
    if (!ok) return;
    curlProgress.value = withTiming(
      1,
      { duration: 700, easing: Easing.bezier(0.42, 0, 0.58, 1) },
      (finished) => {
        if (finished) runOnJS(finishTransition)(nextIndex);
      },
    );
  }, [currentIndex, beginTransition, curlProgress, finishTransition]);

  const goNext = () => goTo(currentIndex + 1);
  const goPrev = () => goTo(currentIndex - 1);
  const goToday = () => {
    const idx = dates.indexOf(today) + 1;
    goTo(idx);
  };

  // Gesture'tan beginTransition'ı tetikleyen wrapper: hangi yöne çevrileceğini
  // başlangıç X koordinatından çıkarır.
  const beginGestureTransition = useCallback((startX: number) => {
    const direction: 1 | -1 = startX > PAGE_W / 2 ? 1 : -1;
    const target = currentIndex + direction;
    if (target < 0 || target > totalPages) return;
    void beginTransition(target, direction);
  }, [currentIndex, totalPages, beginTransition]);

  // Pan gesture: sayfanın alt köşelerinde başlar, parmak hareketi progress'i sürer.
  // Bırakınca: progress > 0.5 ise tamamlanır, değilse iptal edilir.
  // useMemo: currentIndex değiştikçe gesture yenilenir (onEnd'in doğru target'ı kullanması için).
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-8, 8])
      .onBegin((e) => {
        'worklet';
        gestureActive.value = false;
        const inLowerHalf = e.y > PAGE_H * 0.55;
        const nearLeftEdge = e.x < PAGE_W * 0.30;
        const nearRightEdge = e.x > PAGE_W * 0.70;
        if (!inLowerHalf || (!nearLeftEdge && !nearRightEdge)) return;
        gestureActive.value = true;
        gestureDirection.value = e.x > PAGE_W / 2 ? 1 : -1;
        curlProgress.value = 0;
        runOnJS(beginGestureTransition)(e.x);
      })
      .onUpdate((e) => {
        'worklet';
        if (!gestureActive.value) return;
        const dir = gestureDirection.value;
        const totalDistance = PAGE_W * 0.85;
        const traveled = dir === 1 ? -e.translationX : e.translationX;
        const p = Math.max(0, Math.min(1, traveled / totalDistance));
        curlProgress.value = p;
      })
      .onEnd((e) => {
        'worklet';
        if (!gestureActive.value) return;
        gestureActive.value = false;
        const p = curlProgress.value;
        const dir = gestureDirection.value;
        const velocityAlong = dir === 1 ? -e.velocityX : e.velocityX;
        const shouldComplete = p > 0.5 || velocityAlong > 800;
        if (shouldComplete) {
          const target = currentIndex + dir;
          curlProgress.value = withTiming(
            1,
            { duration: 220, easing: Easing.out(Easing.cubic) },
            (finished) => { if (finished) runOnJS(finishTransition)(target); },
          );
        } else {
          curlProgress.value = withSpring(
            0,
            { damping: 18, stiffness: 180 },
            (finished) => { if (finished) runOnJS(cancelTransition)(); },
          );
        }
      });
  }, [
    curlProgress, gestureActive, gestureDirection, currentIndex,
    beginGestureTransition, finishTransition, cancelTransition,
  ]);

  // Cat animatedStyle: kafa kaldırma efekti.
  // - rotate: -8° (gövde hafifçe geri yatar, kafa yukarı bakıyormuş gibi)
  // - translateY: -10 (biraz yukarı kalkar)
  // - scale: hafif büyüme (uyandı hissi)
  // Progress 0 → 0.15 arasında hızlı geçiş (uyandı), 0.15 → 1 sabit kalkık.
  const catAnimatedStyle = useAnimatedStyle(() => {
    const wakeFactor = interpolate(
      curlProgress.value,
      [0, 0.15, 1],
      [0, 1, 1],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(wakeFactor, [0, 1], [0, -8]);
    const ty = interpolate(wakeFactor, [0, 1], [0, -10]);
    const scale = interpolate(wakeFactor, [0, 1], [1, 1.05]);
    return {
      transform: [
        { translateY: ty },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  if (!fontsLoaded) return null;

  // Current visible page
  const isOnCover = currentIndex === 0;
  const currentDate = isOnCover ? null : dates[currentIndex - 1];
  const { weekday, full } = currentDate ? formatDate(currentDate) : { weekday: '', full: '' };

  // Helper: render a page (cover or diary) for any given index
  const renderPage = (idx: number, key: string) => {
    if (idx === 0) return <CoverPage theme={theme} />;
    const date = dates[idx - 1];
    if (!date) return <CoverPage theme={theme} />;
    return (
      <DiaryPage
        key={key}
        theme={theme}
        date={date}
        content={entries[date] ?? ''}
        pageNum={idx}
        totalPages={totalPages}
        isToday={date === today}
        onChangeText={(t) => handleTextChange(date, t)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        {/* Title bar — geri butonu + defter ismi + sil butonu (sadece custom) */}
        <View style={styles.titleBar}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backBtnTxt}>‹ Kitaplık</Text>
          </Pressable>
          <Text style={[styles.screenTitle, { fontFamily: 'Caveat_700Bold' }]}>{notebook.name}</Text>
          {onDelete ? (
            <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="rgba(245,243,255,0.65)" />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        {/* Book area */}
        <View style={styles.bookArea}>
          {/* pageWrapper'a tema page rengini zemin olarak veriyoruz; curl sırasında
              transparent kalan alanlar Lyra arkaplanı yerine bu kitap zeminini gösterir. */}
          <GestureDetector gesture={panGesture}>
            <View style={[styles.pageWrapper, { backgroundColor: theme.page }]}>
              {/* Live current page — transition sırasında Skia overlay üstüne çiziyor */}
              <View
                ref={currentPageRef}
                collapsable={false}
                style={[styles.pageInner, transition ? { opacity: 0 } : null]}
              >
                {renderPage(currentIndex, 'current')}
              </View>

              {/* Off-screen target page for snapshotting — sadece transition sırasında */}
              {pendingTarget !== null && (
                <View
                  ref={targetPageRef}
                  collapsable={false}
                  style={[styles.pageInner, styles.offscreenPage]}
                  pointerEvents="none"
                >
                  {renderPage(pendingTarget, 'target')}
                </View>
              )}

              {/* Skia page-curl overlay during transition */}
              {transition && (
                <View style={styles.curlOverlay} pointerEvents="none">
                  <PageCurl
                    width={PAGE_W}
                    height={PAGE_H}
                    oldImage={transition.oldImage}
                    newImage={transition.newImage}
                    direction={transition.direction}
                    progress={curlProgress}
                  />
                </View>
              )}

              {/* Cat — sadece "Günlük" (standard) defterinde, kapak sayfası dışında */}
              {showCat && !isOnCover && (
                <Animated.Image
                  source={require('../../../assets/journal-cat.png')}
                  style={[styles.cat, catAnimatedStyle]}
                  resizeMode="contain"
                />
              )}

              {/* Voice partial transcript bubble — kullanıcı konuşurken canlı görünür.
                  Final olunca metin sayfaya yazılır ve bubble kaybolur. */}
              {!isOnCover && voice.partialText.length > 0 && (
                <View style={styles.partialBubble} pointerEvents="none">
                  <Text style={styles.partialText} numberOfLines={3}>
                    {voice.partialText}
                  </Text>
                </View>
              )}

              {/* Mikrofon butonu — kapak sayfasında gizli */}
              {!isOnCover && (
                <View style={styles.micPosition}>
                  <VoiceMicButton
                    isListening={voice.isListening}
                    themeAccent={theme.accent}
                    themeSpine={theme.spine}
                    darkPage={isDarkTheme(themeId)}
                    onPress={() => {
                      if (voice.isListening) {
                        voice.stop();
                      } else {
                        void voice.start();
                      }
                    }}
                  />
                </View>
              )}

              {/* Lyra chat butonu — kapak sayfasında gizli (mikrofon gibi) */}
              {!isOnCover && (
                <View style={styles.lyraChatPosition}>
                  <LyraChatButton
                    themeAccent={theme.accent}
                    onPress={() => setChatOpen(true)}
                  />
                </View>
              )}
            </View>
          </GestureDetector>
        </View>

        {/* Navigation */}
        <View style={styles.nav}>
          <Pressable
            onPress={goPrev}
            disabled={currentIndex === 0}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }, currentIndex === 0 && styles.navBtnDisabled]}
          >
            <Text style={styles.navBtnTxt}>‹</Text>
          </Pressable>

          <Pressable onPress={goToday} style={styles.navCenter}>
            <Text style={[styles.navDate, { fontFamily: 'Caveat_700Bold' }]}>
              {isOnCover ? 'Günlüğüm' : full}
            </Text>
            <Text style={[styles.navWeekday, { fontFamily: 'Caveat_400Regular' }]}>
              {isOnCover ? 'Lyra ile birlikte' : (currentDate === today ? 'Bugün' : weekday)}
            </Text>
          </Pressable>

          <Pressable
            onPress={goNext}
            disabled={currentIndex >= totalPages}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }, currentIndex >= totalPages && styles.navBtnDisabled]}
          >
            <Text style={styles.navBtnTxt}>›</Text>
          </Pressable>
        </View>

        {/* Theme picker */}
        <ThemePicker current={themeId} onSelect={setThemeId} />

        {/* Saving indicator */}
        {saving && (
          <Text style={styles.savingTxt}>kaydediliyor...</Text>
        )}

        {/* Lyra chat modal — defterin context'iyle açılır.
            aiAccessible false ise içerik (todayDraft, notebookId) GÖNDERİLMEZ.
            Lyra sadece defter adını + erişimin kapalı olduğunu bilir,
            içerik hakkında konuşmaz/spekülasyon yapmaz. */}
        <LyraChatModal
          visible={chatOpen}
          onClose={() => setChatOpen(false)}
          context={
            notebook.aiAccessible
              ? {
                  mode:         'notebook',
                  notebookId:   notebook.id,
                  notebookName: notebook.name,
                  todayDraft:   entries[today] ?? '',
                  aiAccessible: true,
                }
              : {
                  mode:         'notebook',
                  notebookName: notebook.name,
                  aiAccessible: false,
                }
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main Journal Screen (state machine) ──────────────────────────────────────
// Sekmenin entry point'i. İki view arası geçiş yapar:
//  - 'shelf'    → LibraryShelf (kitaplık raf)
//  - 'notebook' → NotebookView (seçili defterin içeriği)
//
// `useNotebooks` hook'u backend'den notebook listesini fetch eder. Sistem
// defterleri (Journal + Secret) server tarafında ilk request'te otomatik
// bootstrap edilir. Custom defter ekleme/silme/güncelleme API çağrıları
// hook'taki addNotebook / deleteNotebook / updateNotebook ile yapılır.
export default function JournalScreen() {
  const { notebooks, addNotebook, deleteNotebook, updateNotebook } = useNotebooks();
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [shelfChatOpen, setShelfChatOpen] = useState(false);

  // Raf modu için Lyra context'i — defter seçilmemiş, genel günlük asistanı.
  const shelfChatContext: JournalChatContext = useMemo(() => ({ mode: 'shelf' }), []);

  // Aktif defter listede güncellendiyse (örn tema değiştiyse) yansıt
  const liveActiveNotebook = useMemo(() => {
    if (!activeNotebook) return null;
    return notebooks.find((n) => n.id === activeNotebook.id) ?? activeNotebook;
  }, [notebooks, activeNotebook]);

  const handleAddNotebook = useCallback(() => {
    showAddNotebookFlow({
      onSubmit: async (input) => {
        await addNotebook({
          name:         input.name,
          themeId:      input.themeId,
          silhouette:   input.silhouette,
          aiAccessible: input.aiAccessible,
        });
      },
    });
  }, [addNotebook]);

  const handleLongPressNotebook = useCallback((notebook: Notebook) => {
    showNotebookContextMenu(notebook, {
      onRename: (id, newName) => {
        void updateNotebook(id, { name: newName });
      },
      onChangeTheme: (id, themeId) => {
        void updateNotebook(id, { themeId });
      },
      onDelete: (id) => {
        void deleteNotebook(id);
      },
    });
  }, [updateNotebook, deleteNotebook]);

  // Defter seçimi — private (gizli) defter için PIN/Face ID akışı, diğerleri direkt açılır.
  const handleSelectNotebook = useCallback((notebook: Notebook) => {
    if (notebook.type === 'private') {
      openSecretNotebook({
        onUnlock: () => setActiveNotebook(notebook),
        onCancel: () => {
          // Kullanıcı vazgeçti veya başarısız — kitaplıkta kal
        },
      });
      return;
    }
    setActiveNotebook(notebook);
  }, []);

  if (liveActiveNotebook) {
    const isCustom = liveActiveNotebook.type === 'custom';
    return (
      <NotebookView
        notebook={liveActiveNotebook}
        onBack={() => setActiveNotebook(null)}
        onDelete={
          isCustom
            ? () => {
                showDeleteNotebookFlow(liveActiveNotebook, {
                  onDelete: async (id) => {
                    const ok = await deleteNotebook(id);
                    if (ok) setActiveNotebook(null);
                  },
                });
              }
            : undefined
        }
      />
    );
  }

  return (
    <View style={styles.shelfRoot}>
      <LibraryShelf
        notebooks={notebooks}
        onSelectNotebook={handleSelectNotebook}
        onAddNotebook={handleAddNotebook}
        onLongPressNotebook={handleLongPressNotebook}
      />

      {/* Lyra chat butonu — rafta sağ-altta, native tab bar'ın üstünde.
          NativeTabs ~50pt + bir miktar nefes payı = bottom 110. */}
      <View style={styles.shelfLyraPosition} pointerEvents="box-none">
        <LyraChatButton onPress={() => setShelfChatOpen(true)} />
      </View>

      <LyraChatModal
        visible={shelfChatOpen}
        onClose={() => setShelfChatOpen(false)}
        context={shelfChatContext}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0A1A' },

  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    color: '#F5F3FF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  backBtn: {
    minWidth: 96,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnTxt: {
    color: 'rgba(245,243,255,0.75)',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  deleteBtn: {
    minWidth: 96,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },

  bookArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageWrapper: {
    width: PAGE_W,
    height: PAGE_H,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
    elevation: 12,
    position: 'relative',
  },
  pageInner: {
    width: PAGE_W,
    height: PAGE_H,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  offscreenPage: {
    // Same on-screen geometry so layout matches; just hidden visually for snapshot.
    opacity: 0,
  },
  curlOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PAGE_W,
    height: PAGE_H,
    zIndex: 5,
  },

  page: {
    width: PAGE_W,
    height: PAGE_H,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },

  // Cover styles
  stitchLine: {
    position: 'absolute',
    left: 18,
    top: 16,
    bottom: 16,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.06,
    backgroundColor: 'transparent',
  },
  embossBorder: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 1,
    borderRadius: 2,
  },
  coverContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 90,
  },
  coverIllustration: {
    width: 170,
    height: 170,
    marginBottom: -10,
    marginLeft: 16,
  },
  coverTitle: {
    fontSize: 44,
    fontFamily: 'DancingScript_700Bold',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 16,
  },
  coverSub: {
    fontSize: 18,
    fontFamily: 'Caveat_400Regular',
    marginLeft: 16,
  },

  // Diary page styles
  marginLine: {
    position: 'absolute',
    left: 44,
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 14,
    height: 36,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  dateHeader: {
    paddingTop: 18,
    paddingHorizontal: 52,
    paddingBottom: 0,
  },
  weekdayText: {
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerIcon: {
    fontSize: 13,
  },
  linesContainer: {
    flex: 1,
    marginHorizontal: 52,
    marginTop: 0,
    position: 'relative',
  },
  line: {
    height: 1,
  },
  textInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 21,
    lineHeight: 30,
    padding: 0,
    paddingTop: 2,
  },
  pageNum: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    fontSize: 13,
  },

  // Cat — sayfanın üst kenarında yatıyor: gövdesi/kafası üstte, patileri ve kuyruğu sayfanın içine sarkıyor.
  // top: -CAT_SIZE * 0.65 → cat'in ~%65'i sayfanın üst kenarının üzerinde, %35'i sayfa içinde.
  cat: {
    position: 'absolute',
    top: -CAT_SIZE * 0.65,
    right: -PAGE_W * 0.02,
    width: CAT_SIZE * 1.3,
    height: CAT_SIZE * 1.0,
    zIndex: 10,
  },

  // Mikrofon FAB — sayfanın sağ-alt köşesi, page-num'un hemen üstünde
  micPosition: {
    position: 'absolute',
    right: 6,
    bottom: 32,
    zIndex: 20,
  },

  // Lyra chat butonu — mikrofonun hemen üstünde, sayfanın sağ-altında.
  // Defter modunda her zaman görünür (kapak dahil), mikrofondan ayrı stack.
  lyraChatPosition: {
    position: 'absolute',
    right: 6,
    bottom: 80,
    zIndex: 21,
  },

  // Raf modu — Lyra butonu sağ-altta, tab bar üzerinde.
  shelfRoot: {
    flex: 1,
  },
  shelfLyraPosition: {
    position: 'absolute',
    left: LYRA_SHELF_LEFT,
    top:  LYRA_SHELF_TOP,
    zIndex: 999,
    elevation: 999,
  },

  // Voice partial transkript bubble — sayfanın üst-orta kısmında,
  // kullanıcı konuşurken canlı geri bildirim. Final olunca kaybolur ve
  // metin TextInput'a yazılır.
  partialBubble: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(40, 28, 50, 0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 214, 0.18)',
    zIndex: 15,
  },
  partialText: {
    color: 'rgba(255, 244, 214, 0.95)',
    fontSize: 14,
    lineHeight: 19,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  // Navigation
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(98,55,201,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnTxt: { fontSize: 26, color: '#F5F3FF', lineHeight: 30 },
  navCenter: { alignItems: 'center' },
  navDate: { fontSize: 18, color: '#F5F3FF' },
  navWeekday: { fontSize: 14, color: '#A89EC8', marginTop: 1 },

  // Theme picker — yatay scroll (13 tema ekrana sığmaz)
  themeScroll: {
    flexGrow: 0,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  themeBtn: { alignItems: 'center', gap: 4 },
  // Konteyner sadece konum + selected ring. Yuvarlatma her yarımda yapılır
  // ki iOS Fabric'in flex+borderRadius clip bug'ına girmesin.
  themeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCircleSelected: {
    borderColor: '#F5F3FF',
    transform: [{ scale: 1.15 }],
  },
  themeHalfLeft: {
    width:  14,
    height: 28,
    borderTopLeftRadius:    14,
    borderBottomLeftRadius: 14,
  },
  themeHalfRight: {
    width:  14,
    height: 28,
    borderTopRightRadius:    14,
    borderBottomRightRadius: 14,
  },
  themeLabel: {
    fontSize: 10,
    color: '#6B5E8A',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  savingTxt: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6B5E8A',
    fontFamily: 'Caveat_400Regular',
    paddingBottom: 4,
  },
});
