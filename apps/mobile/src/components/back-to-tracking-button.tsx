import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  tint?: string;
  label?: string;
}

export function BackToTrackingButton({ tint = '#FFFFFF', label = 'Geri' }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    router.replace('/(tabs)/tracking');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={16}
      style={({ pressed }) => [
        st.btn,
        { top: insets.top + 10 },
        pressed && { opacity: 0.5 },
      ]}
    >
      <View style={st.row}>
        <Ionicons name="chevron-back" size={24} color={tint} />
        <Text style={[st.label, { color: tint }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 12,
    zIndex: 1000,
    elevation: 1000,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '500',
    marginLeft: -2,
  },
});
