import { View, Pressable, StyleSheet, Text as RNText } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/constants/theme';

export default function SessionScreen() {
  const { getToken } = useAuth();
  const { status, isListening, isSpeaking, startSession, endSession, setStatus, reset } = useSessionStore();

  // Reset ended state when tab is revisited so "Great session!" doesn't persist
  useEffect(() => {
    if (status === 'ended') reset();
  }, []);

  const handleStartSession = async () => {
    try {
      await getToken();
      startSession('temp-session-id');
      setStatus('active');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'idle' || status === 'ended') {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <View style={st.idleContainer}>
          {/* Lyra avatar glow rings */}
          <View style={st.avatarWrap}>
            <View style={st.ring3} />
            <View style={st.ring2} />
            <View style={st.ring1} />
            <View style={st.avatarCircle}>
              <Ionicons name="person" size={72} color={colors.brand[300]} />
            </View>
          </View>

          <RNText style={st.idleTitle}>Ready to talk?</RNText>
          <RNText style={st.idleSub}>Lyra is here to listen and support you.</RNText>

          {status === 'ended' && (
            <RNText style={st.endedMsg}>
              Great session! Your summary is saved in Journal.
            </RNText>
          )}

          <Pressable
            onPress={handleStartSession}
            style={({ pressed }) => [st.startBtn, pressed && st.startBtnPressed]}
          >
            <Ionicons name="mic" size={20} color="#fff" style={{ marginRight: 8 }} />
            <RNText style={st.startBtnTxt}>Start Session</RNText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Active session
  const stateIcon = isSpeaking ? 'volume-high' : isListening ? 'mic' : 'ellipsis-horizontal';
  const stateLabel = isSpeaking ? 'Lyra is speaking…' : isListening ? 'Listening…' : 'Processing…';
  const ringColor = isSpeaking ? colors.brand[400] : isListening ? colors.accent.growth : colors.text.muted;

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <View style={st.activeContainer}>
        {/* Status pill */}
        <View style={st.statusPill}>
          <View style={[st.statusDot, { backgroundColor: colors.accent.growth }]} />
          <RNText style={st.statusTxt}>Session Active</RNText>
        </View>

        {/* Live avatar */}
        <View style={st.liveWrap}>
          <View style={[st.liveRing, { borderColor: ringColor + '40' }]} />
          <View style={[st.liveCircle, { borderColor: ringColor }]}>
            <Ionicons name={stateIcon} size={72} color={ringColor} />
          </View>
          <RNText style={[st.stateLabel, { color: ringColor }]}>{stateLabel}</RNText>
        </View>

        {/* Controls */}
        <View style={st.controls}>
          <Pressable style={st.controlBtn}>
            <Ionicons name="mic-outline" size={26} color={colors.text.primary} />
          </Pressable>

          <Pressable
            onPress={endSession}
            style={st.endBtn}
          >
            <Ionicons name="call" size={26} color="#fff" />
          </Pressable>

          <Pressable style={st.controlBtn}>
            <Ionicons name="ellipsis-horizontal" size={26} color={colors.text.primary} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 180;
const RING1 = AVATAR_SIZE + 28;
const RING2 = AVATAR_SIZE + 60;
const RING3 = AVATAR_SIZE + 96;

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },

  // Idle state
  idleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatarWrap: { width: RING3, height: RING3, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring3: { position: 'absolute', width: RING3, height: RING3, borderRadius: RING3 / 2, borderWidth: 1, borderColor: 'rgba(98,55,201,0.08)' },
  ring2: { position: 'absolute', width: RING2, height: RING2, borderRadius: RING2 / 2, borderWidth: 1, borderColor: 'rgba(98,55,201,0.14)' },
  ring1: { position: 'absolute', width: RING1, height: RING1, borderRadius: RING1 / 2, borderWidth: 1.5, borderColor: 'rgba(98,55,201,0.22)' },
  avatarCircle: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.surface.secondary, borderWidth: 2, borderColor: colors.brand[700], alignItems: 'center', justifyContent: 'center' },
  idleTitle: { fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 },
  idleSub: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  endedMsg: { fontSize: 14, color: colors.accent.growth, textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand[500], borderRadius: 18, paddingVertical: 16, width: 240 },
  startBtnPressed: { opacity: 0.82 },
  startBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  // Active state
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 32, paddingHorizontal: 24 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.secondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(130,217,165,0.2)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusTxt: { fontSize: 13, color: colors.accent.growth, fontWeight: '600' },
  liveWrap: { alignItems: 'center' },
  liveRing: { position: 'absolute', width: RING1 + 20, height: RING1 + 20, borderRadius: (RING1 + 20) / 2, borderWidth: 1.5 },
  liveCircle: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.surface.secondary, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stateLabel: { marginTop: AVATAR_SIZE / 2 + 24, fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  controlBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.surface.secondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(98,55,201,0.2)' },
  endBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.accent.alert, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '135deg' }] },
});
