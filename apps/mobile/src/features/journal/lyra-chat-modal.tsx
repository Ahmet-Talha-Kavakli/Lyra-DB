import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  Dimensions, Easing, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJournalChat, type JournalChatContext, type ChatMessage } from './use-journal-chat';

const { height: SCREEN_H } = Dimensions.get('window');
// Sheet, ekranın alt ~%72'sini kaplar — üstte parent görünür kalır.
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.72);

export function LyraChatModal({
  visible,
  onClose,
  context,
}: {
  visible: boolean;
  onClose: () => void;
  context: JournalChatContext;
}) {
  const { messages, isStreaming, sendMessage, clearAndSummarize } = useJournalChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  // Animations: backdrop opacity + sheet translateY
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Reset for next open
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_HEIGHT);
    }
  }, [visible]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  const animateOutThen = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => cb());
  };

  const handleClose = () => {
    animateOutThen(() => {
      clearAndSummarize();
      setDraft('');
      onClose();
    });
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(text, context);
    setDraft('');
  };

  // Drag-to-dismiss: aşağı sürüklerken sheet parmağı takip eder; bırakıldığında
  // 120px veya hızlı flick eşiğini geçtiyse kapanır, aksi halde başa döner.
  // İki ayrı responder:
  //   - dragHandle: küçük handle çubuğa dokunur dokunmaz claim (start)
  //   - header: sadece aşağı drag ile claim (close butonu çalışsın)
  const panConfig = useMemo(() => ({
    onPanResponderMove: (_evt: unknown, gesture: { dy: number }) => {
      if (gesture.dy > 0) {
        sheetTranslateY.setValue(gesture.dy);
        const next = Math.max(0, 1 - (gesture.dy / SHEET_HEIGHT) * 0.6);
        backdropOpacity.setValue(next);
      }
    },
    onPanResponderRelease: (_evt: unknown, gesture: { dy: number; vy: number }) => {
      const shouldClose = gesture.dy > 120 || gesture.vy > 1.2;
      if (shouldClose) {
        animateOutThen(() => {
          clearAndSummarize();
          setDraft('');
          onClose();
        });
      } else {
        Animated.parallel([
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 4,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
  }), [sheetTranslateY, backdropOpacity, clearAndSummarize, onClose]);

  const dragHandlePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    ...panConfig,
  }), [panConfig]);

  const headerPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gesture) => {
      return gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
    },
    ...panConfig,
  }), [panConfig]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop — yarı-saydam koyu, tıkla → kapat */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet — alttan kayar, ekranın %72'si */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            {/* Drag handle — start-claim, dokunur dokunmaz drag responder */}
            <View {...dragHandlePanResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.handleBar} />
            </View>

            {/* Header — sadece aşağı sürükleme ile claim (close butonunu boğmasın) */}
            <View {...headerPanResponder.panHandlers} style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.lyraDot}>
                  <Ionicons name="sparkles" size={14} color="#FFE9B0" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Lyra</Text>
                  <Text style={styles.headerSub}>
                    {context.mode === 'notebook' && context.notebookName
                      ? `"${context.notebookName}" yanında`
                      : 'günlüğünde'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="rgba(245,243,255,0.7)" />
              </Pressable>
            </View>

            {/* Messages */}
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Buradayım, nasıl yardımcı olabilirim?
                </Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => <MessageBubble msg={item} />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Input */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Lyra'ya bir şey yaz…"
                placeholderTextColor="rgba(245,243,255,0.35)"
                multiline
                maxLength={1000}
                editable={!isStreaming}
              />
              <Pressable
                onPress={handleSend}
                disabled={isStreaming || draft.trim().length === 0}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (isStreaming || draft.trim().length === 0) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={6}
              >
                {isStreaming
                  ? <ActivityIndicator color="#F5F3FF" size="small" />
                  : <Ionicons name="arrow-up" size={18} color="#F5F3FF" />}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowLyra]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleLyra]}>
        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextLyra}>
          {msg.content || (msg.role === 'assistant' ? '…' : '')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 16, 0.42)',
  },

  sheet: {
    position:        'absolute',
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(20, 14, 36, 0.94)',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.4,
    shadowRadius:    14,
    elevation:       16,
  },

  dragArea: {
    paddingVertical: 8,
    alignItems:      'center',
  },
  handleBar: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: 'rgba(245,243,255,0.25)',
  },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(245,243,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  lyraDot: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(40, 28, 60, 0.9)',
    borderWidth:     1,
    borderColor:     'rgba(245,243,255,0.28)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerTitle: { color: '#F5F3FF', fontSize: 17, fontWeight: '600' },
  headerSub:   { color: 'rgba(245,243,255,0.45)', fontSize: 12, marginTop: 1 },
  closeBtn: {
    width:          32,
    height:         32,
    alignItems:     'center',
    justifyContent: 'center',
  },

  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap:            12,
  },
  emptyText:  {
    color:      'rgba(245,243,255,0.55)',
    fontSize:   15,
    textAlign:  'center',
    lineHeight: 22,
  },

  listContent: { padding: 16, gap: 8 },
  row:         { flexDirection: 'row' },
  rowUser:     { justifyContent: 'flex-end' },
  rowLyra:     { justifyContent: 'flex-start' },
  bubble: {
    maxWidth:           '82%',
    paddingVertical:    10,
    paddingHorizontal:  14,
    borderRadius:       16,
  },
  bubbleUser:     { backgroundColor: '#5B4F9E', borderBottomRightRadius: 4 },
  bubbleLyra:     { backgroundColor: 'rgba(245,243,255,0.08)', borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: '#F5F3FF', fontSize: 15, lineHeight: 21 },
  bubbleTextLyra: { color: '#F5F3FF', fontSize: 15, lineHeight: 21 },

  inputBar: {
    flexDirection:    'row',
    alignItems:       'flex-end',
    gap:              8,
    paddingHorizontal: 12,
    paddingTop:        10,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    'rgba(245,243,255,0.1)',
  },
  input: {
    flex:              1,
    minHeight:         40,
    maxHeight:         120,
    paddingHorizontal: 14,
    paddingTop:        10,
    paddingBottom:     10,
    backgroundColor:   'rgba(245,243,255,0.06)',
    borderRadius:      18,
    color:             '#F5F3FF',
    fontSize:          15,
    lineHeight:        20,
  },
  sendBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#5B4F9E',
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(91,79,158,0.4)' },
});
