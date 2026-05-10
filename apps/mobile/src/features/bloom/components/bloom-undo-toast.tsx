/**
 * BloomUndoToast — iOS Mail tarzı "anında geri al" toast'u.
 *
 * Period start mark/unmark'tan sonra ekranın altında 5 saniye boyunca
 * görünür. "Undo" tap → onUndo çağrılır, toast hemen kapanır. Başka bir
 * mark/unmark olursa önceki toast iptal olur, yenisi gösterilir.
 *
 * Apple Sheets / Mail pattern: kazara işlemleri ilk anda yakalamak için
 * görünür, geç fark eden için ayrıca long-press menüsü "Kaldır" seçeneği
 * sunar (defense in depth).
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

const VISIBLE_MS = 5000;
const FADE_MS = 220;

interface Props {
  /** Falsy → hidden. String value → toast message; key change retriggers timer. */
  message: string | null;
  /** Unique id of the current toast — değişince timer reset, fresh fade-in. */
  toastKey?: string | number;
  undoLabel: string;
  onUndo: () => void;
  /** Auto-dismiss callback — parent state'i temizler. */
  onDismiss: () => void;
}

export function BloomUndoToast({
  message,
  toastKey,
  undoLabel,
  onUndo,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0, duration: FADE_MS, useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20, duration: FADE_MS, useNativeDriver: true,
        }),
      ]).start();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      return;
    }

    // Fresh toast — fade in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: FADE_MS, useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true, bounciness: 6, speed: 16,
      }),
    ]).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      onDismiss();
    }, VISIBLE_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // toastKey changes → effect re-runs (timer reset for back-to-back toasts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, toastKey]);

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onUndo();
  };

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        st.wrap,
        { bottom: insets.bottom + 90, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={st.toast}>
        {Platform.OS === 'ios' && (
          <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
        )}
        <View style={st.tint} />
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={colors.brand[200]}
          style={{ marginRight: 10 }}
        />
        <RNText style={st.text} numberOfLines={1}>
          {message}
        </RNText>
        <Pressable
          onPress={handleUndo}
          hitSlop={10}
          style={({ pressed }) => [st.undoBtn, pressed && { opacity: 0.55 }]}
        >
          <RNText style={st.undoText}>{undoLabel}</RNText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 240,
    maxWidth: 420,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.brand[900],
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 14, 36, 0.55)',
  },
  text: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 6,
  },
  undoText: {
    color: colors.brand[200],
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
