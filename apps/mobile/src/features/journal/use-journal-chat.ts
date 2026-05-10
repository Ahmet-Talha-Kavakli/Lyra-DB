import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/expo';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { API_BASE_URL } from '@/constants/api';

export type JournalChatMode = 'shelf' | 'notebook';

export interface JournalChatContext {
  mode:          JournalChatMode;
  notebookId?:   string;
  notebookName?: string;
  todayDraft?:   string;
  /**
   * Notebook modunda: kullanıcının bu deftere AI erişim verip vermediği.
   * False ise backend defter içeriğini hiç fetch etmez, prompt'a "erişim
   * kapalı" sinyali düşer ve Lyra içerik hakkında konuşmaz.
   */
  aiAccessible?: boolean;
}

export interface ChatMessage {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

interface ServerHistoryTurn { role: 'user' | 'assistant'; content: string }

const NAMESPACE = '/journal-chat';

let msgCounter = 0;
const nextId = () => `m${++msgCounter}-${Date.now()}`;

/**
 * Hook for the in-journal Lyra chat. Connects on first send, holds the
 * conversation in memory, and on close fires a fire-and-forget summarize
 * call to the backend (so future sessions can reference the chat).
 */
export function useJournalChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingIdRef = useRef<string | null>(null);
  const lastContextRef = useRef<JournalChatContext | null>(null);

  // Wire socket listeners once
  useEffect(() => {
    const sock = getSocket({ namespace: NAMESPACE });

    const onChunk = (data: { text: string }) => {
      const id = streamingIdRef.current;
      if (!id) return;
      setMessages((prev) => prev.map((m) =>
        m.id === id ? { ...m, content: m.content + data.text } : m,
      ));
    };

    const onDone = () => {
      streamingIdRef.current = null;
      setIsStreaming(false);
    };

    const onError = (data: { message: string }) => {
      const id = streamingIdRef.current;
      if (id) {
        setMessages((prev) => prev.map((m) =>
          m.id === id ? { ...m, content: m.content || `(hata: ${data.message})` } : m,
        ));
      }
      streamingIdRef.current = null;
      setIsStreaming(false);
    };

    sock.on('journal:chunk', onChunk);
    sock.on('journal:done',  onDone);
    sock.on('journal:error', onError);

    return () => {
      sock.off('journal:chunk', onChunk);
      sock.off('journal:done',  onDone);
      sock.off('journal:error', onError);
    };
  }, []);

  const sendMessage = useCallback((text: string, context: JournalChatContext) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const clerkUserId = user?.id;
    if (!clerkUserId) return;

    lastContextRef.current = context;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '' };
    streamingIdRef.current = assistantMsg.id;

    setMessages((prev) => {
      const next = [...prev, userMsg, assistantMsg];
      // Build history from PREVIOUS state, not including the new user msg
      // (the gateway treats `message` separately from `conversationHistory`).
      const history: ServerHistoryTurn[] = prev.map((m) => ({ role: m.role, content: m.content }));
      const sock = getSocket({ namespace: NAMESPACE });
      sock.emit('journal:message', {
        clerkUserId,
        userName:            user?.firstName ?? user?.username ?? '',
        message:             trimmed,
        conversationHistory: history,
        context,
      });
      return next;
    });
    setIsStreaming(true);
  }, [user, isStreaming]);

  /**
   * Close the chat: clear local state and ping the backend to summarize +
   * persist into memory. Fire-and-forget — caller doesn't await.
   */
  const clearAndSummarize = useCallback(() => {
    const ctx = lastContextRef.current;
    const history: ServerHistoryTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const clerkUserId = user?.id;

    setMessages([]);
    streamingIdRef.current = null;
    setIsStreaming(false);
    lastContextRef.current = null;

    if (!clerkUserId || !ctx || history.length < 2) return;

    fetch(`${API_BASE_URL}/journal-chat/summarize`, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-clerk-user-id':  clerkUserId,
      },
      body: JSON.stringify({ conversationHistory: history, context: ctx }),
    }).catch(() => {
      // Silent — summarize is best-effort
    });
  }, [messages, user]);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearAndSummarize,
  };
}

/** Tear down the journal-chat socket connection (call on app unmount if ever needed). */
export function disconnectJournalChat() {
  disconnectSocket(NAMESPACE);
}
