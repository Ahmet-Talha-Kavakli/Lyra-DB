import { useEffect, useRef } from 'react';
import { Animated, Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Mikrofon FAB — günlük sayfasının sağ-alt köşesinde.
 *
 * - Idle: koyu yarı-saydam daire + krem mikrofon ikonu
 * - Listening: kırmızımsı arka plan + sürekli pulse halo (nefes alıyor gibi)
 *
 * Tek tap → toggle (start/stop). Üst seviye `useVoiceInput` hook'undan
 * `isListening` ve callback'leri geçirilir.
 */
export function VoiceMicButton({
  isListening,
  onPress,
  themeAccent,
  darkPage = false,
  themeSpine,
}: {
  isListening: boolean;
  onPress: () => void;
  /** Defter teması — idle halde ikon rengi tema accent'inden gelir */
  themeAccent: string;
  /** Koyu zeminde mi? FAB dolgusu accent'e döner, ikon koyu olur (kontrast). */
  darkPage?: boolean;
  /** Koyu sayfa modunda ikon rengi (tema spine'ı). Default: koyu kahve. */
  themeSpine?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isListening) {
      pulse.setValue(0);
      return;
    }
    let cancelled = false;
    const runOnce = () => {
      if (cancelled) return;
      pulse.setValue(0);
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }).start(() => {
        if (!cancelled) runOnce();
      });
    };
    runOnce();
    return () => {
      cancelled = true;
    };
  }, [isListening]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.55, 0],
  });

  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.container}>
      {/* Pulse halo — sadece listening modunda */}
      {isListening && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { transform: [{ scale: haloScale }], opacity: haloOpacity },
          ]}
        />
      )}
      <View
        style={[
          styles.fab,
          // Koyu sayfada accent rengi ile dolu, daha güçlü gölge → kontrast
          darkPage && !isListening && {
            backgroundColor: themeAccent,
            borderColor:     'rgba(0, 0, 0, 0.18)',
            shadowOpacity:   0.45,
            shadowRadius:    6,
          },
          isListening && styles.fabActive,
        ]}
      >
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={18}
          color={
            isListening
              ? '#FFF4D6'
              : darkPage
                ? (themeSpine ?? '#2A1A08')  // koyu sayfada koyu ikon (kontrast)
                : themeAccent                 // açık sayfada accent
          }
        />
      </View>
    </Pressable>
  );
}

const FAB_SIZE = 38;

const styles = StyleSheet.create({
  container: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(40, 28, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  fabActive: {
    backgroundColor: '#C8504D',
    borderColor: 'rgba(255, 244, 214, 0.35)',
  },
  halo: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#C8504D',
  },
});
