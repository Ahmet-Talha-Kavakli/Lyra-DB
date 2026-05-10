import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';

const sockets = new Map<string, Socket>();

/**
 * Get or create a Socket.io connection to the backend on a specific namespace.
 * Connections are cached per namespace.
 *
 *   getSocket()                    → default '/'
 *   getSocket({ namespace: '/journal-chat' })
 */
export function getSocket(opts?: { namespace?: string; token?: string }): Socket {
  const namespace = opts?.namespace ?? '/';
  const token     = opts?.token;

  const existing = sockets.get(namespace);
  if (existing?.connected) return existing;

  const url = namespace === '/' ? SOCKET_URL : `${SOCKET_URL}${namespace}`;
  const sock = io(url, {
    transports:           ['websocket'],
    auth:                 token ? { token } : undefined,
    reconnection:         true,
    reconnectionAttempts: 10,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 5000,
  });

  sockets.set(namespace, sock);
  return sock;
}

export function disconnectSocket(namespace?: string) {
  if (namespace) {
    sockets.get(namespace)?.disconnect();
    sockets.delete(namespace);
    return;
  }
  for (const [, sock] of sockets) sock.disconnect();
  sockets.clear();
}
