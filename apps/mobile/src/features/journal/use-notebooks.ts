import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/expo';
import type { Notebook, ThemeId, Silhouette, ThicknessId } from './notebooks';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Backend'in /notebooks endpoint'inden gelen ham response — snake_case değil
 * camelCase (NestJS Prisma'yı camelCase JSON olarak serialize eder).
 * Bizim mobil tipimiz `Notebook` (notebooks.ts) ile yapı olarak hemen hemen
 * aynı; tek fark: backend `notebookType`, mobil `type`. Map ediyoruz.
 */
interface ServerNotebook {
  id:           string;
  notebookType: 'standard' | 'private' | 'custom';
  name:         string;
  themeId:      ThemeId;
  thicknessId:  ThicknessId;
  silhouette:   Silhouette;
  locked:       boolean;
  aiAccessible: boolean;
  createdAt:    string;
}

function mapFromServer(s: ServerNotebook): Notebook {
  return {
    id:           s.id,
    type:         s.notebookType,
    name:         s.name,
    themeId:      s.themeId,
    thicknessId:  s.thicknessId,
    silhouette:   s.silhouette,
    locked:       s.locked,
    aiAccessible: s.aiAccessible,
    createdAt:    s.createdAt,
  };
}

/**
 * Notebook'ları backend'den yöneten hook.
 *
 * - İlk mount'ta `GET /notebooks` (server tarafında system defterleri otomatik
 *   bootstrap edilir, hiç istek atılmasa bile mevcut user'lar için zaten oradalar).
 * - `addNotebook(input)` → `POST /notebooks` → state'i optimistic güncelle
 * - `deleteNotebook(id)` → `DELETE /notebooks/:id`
 * - `updateNotebook(id, patch)` → `PATCH /notebooks/:id`
 *
 * Tüm mutasyonlar başarısızlık durumunda state'i geri çekmez (basit) — şimdilik
 * server kabul ettiği varsayımıyla optimistic. Hata `error` state'ine düşer.
 */
export function useNotebooks() {
  const { user } = useUser();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback((): Record<string, string> => {
    if (!user?.id) return {};
    return {
      'Content-Type':    'application/json',
      'x-clerk-user-id': user.id,
    };
  }, [user?.id]);

  const reload = useCallback(async () => {
    if (!user?.id) {
      console.log('[useNotebooks] no user.id yet, skipping fetch');
      return;
    }
    console.log('[useNotebooks] fetching from', `${API_URL}/notebooks`, 'as', user.id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/notebooks`, { headers: headers() });
      console.log('[useNotebooks] response status:', res.status);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[useNotebooks] non-OK response:', res.status, body);
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const data: ServerNotebook[] = await res.json();
      console.log('[useNotebooks] received', data.length, 'notebooks:', data.map((n) => `${n.notebookType}:${n.name}`));
      setNotebooks(data.map(mapFromServer));
    } catch (e) {
      console.error('[useNotebooks] fetch error:', e);
      setError(e instanceof Error ? e.message : 'fetch-failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id, headers]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addNotebook = useCallback(
    async (input: {
      name:         string;
      themeId:      ThemeId;
      silhouette:   Silhouette;
      aiAccessible: boolean;
      thicknessId?: ThicknessId;
    }): Promise<Notebook | null> => {
      try {
        const res = await fetch(`${API_URL}/notebooks`, {
          method:  'POST',
          headers: headers(),
          body:    JSON.stringify(input),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${errBody}`);
        }
        const created: ServerNotebook = await res.json();
        const mapped = mapFromServer(created);
        setNotebooks((prev) => [...prev, mapped]);
        return mapped;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'create-failed');
        return null;
      }
    },
    [headers],
  );

  const deleteNotebook = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/notebooks/${id}`, {
          method:  'DELETE',
          headers: headers(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setNotebooks((prev) => prev.filter((n) => n.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'delete-failed');
        return false;
      }
    },
    [headers],
  );

  const updateNotebook = useCallback(
    async (
      id: string,
      patch: { name?: string; themeId?: ThemeId; thicknessId?: ThicknessId },
    ): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/notebooks/${id}`, {
          method:  'PATCH',
          headers: headers(),
          body:    JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: ServerNotebook = await res.json();
        const mapped = mapFromServer(updated);
        setNotebooks((prev) => prev.map((n) => (n.id === id ? mapped : n)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'update-failed');
        return false;
      }
    },
    [headers],
  );

  return {
    notebooks,
    loading,
    error,
    reload,
    addNotebook,
    deleteNotebook,
    updateNotebook,
  };
}
