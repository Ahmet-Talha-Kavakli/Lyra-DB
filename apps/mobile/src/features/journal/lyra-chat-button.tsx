import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Lyra chat FAB — placeholder ikon buton (sonra özelleştirilecek).
 * Hem raf görünümünde hem defter açıkken kullanılır; konumu parent decides.
 */
export function LyraChatButton({
  onPress,
  themeAccent,
}: {
  onPress: () => void;
  /** Defter teması — defter modunda accent rengi; rafta default geçilir */
  themeAccent?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.container}>
      <View
        style={[
          styles.fab,
          themeAccent ? { borderColor: hexToRgba(themeAccent, 0.5) } : null,
        ]}
      >
        <Ionicons name="sparkles" size={18} color="#FFE9B0" style={styles.icon} />
      </View>
    </Pressable>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const FAB_SIZE = 38;

const styles = StyleSheet.create({
  container: {
    width:          FAB_SIZE,
    height:         FAB_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  fab: {
    width:           FAB_SIZE,
    height:          FAB_SIZE,
    borderRadius:    FAB_SIZE / 2,
    backgroundColor: 'rgba(40, 28, 60, 0.78)',
    borderWidth:     1,
    borderColor:     'rgba(245, 243, 255, 0.28)',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.3,
    shadowRadius:    5,
    elevation:       6,
  },
  icon: {
    transform: [{ translateX: 1 }],
  },
});
