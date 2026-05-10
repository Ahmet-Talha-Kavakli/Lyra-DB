import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  THEMES,
  createCustomNotebook,
  canDeleteNotebook,
  canRenameNotebook,
  type Notebook,
  type ThemeId,
  type Silhouette,
} from './notebooks';

// ─── Silüet seçenekleri (custom defter ekleme akışında 2. adım) ──────────────

const SILHOUETTES: { id: Silhouette; label: string }[] = [
  { id: 'classic', label: 'Klasik (düz üst)' },
  { id: 'arched',  label: 'Kemerli (yuvarlak üst)' },
  { id: 'pointed', label: 'Sivri (üçgen üst)' },
];

/**
 * iOS native UI akışları — yeni paket eklenmedi.
 *
 * Yeni defter ekleme sırası (AI sorusu BAŞTA):
 *   1. Alert.alert  — "Yapay zekam okuyabilsin mi?" [Evet] / [Hayır, sadece bana özel]
 *   2. Alert.prompt — Defter ismi (max 20 char)
 *   3. ActionSheet  — Tema (7 seçenek + Vazgeç)
 *   4. ActionSheet  — Kalınlık (İnce / Kalın + Vazgeç)
 *   5. createCustomNotebook + onAdd callback
 *
 * Long-press context menu:
 *   - Custom: Yeniden Adlandır / Tema Değiştir / Sil (destructive)
 *   - System (Günlük & Secret): Tema Değiştir (rename + sil disabled)
 *
 * Silme: Alert.alert destructive onay → onDelete.
 */

// ─── Long-press context menu ─────────────────────────────────────────────────

export interface NotebookContextMenuCallbacks {
  onRename?: (notebookId: string, newName: string) => void;
  onChangeTheme?: (notebookId: string, themeId: ThemeId) => void;
  onDelete: (notebookId: string) => void;
}

export function showNotebookContextMenu(
  notebook: Notebook,
  callbacks: NotebookContextMenuCallbacks,
) {
  if (Platform.OS !== 'ios') {
    showDeleteNotebookFlow(notebook, { onDelete: callbacks.onDelete });
    return;
  }

  const canRename = canRenameNotebook(notebook);
  const canDelete = canDeleteNotebook(notebook);

  const options = ['Yeniden Adlandır', 'Tema Değiştir', 'Sil', 'Vazgeç'];
  const cancelIdx = 3;
  const destructiveIdx = 2;
  const disabledIndices: number[] = [];
  if (!canRename) disabledIndices.push(0);
  if (!canDelete) disabledIndices.push(2);

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: notebook.name,
      message:
        !canRename && !canDelete
          ? 'Sistem defteri — yalnızca tema değiştirilebilir'
          : undefined,
      options,
      cancelButtonIndex: cancelIdx,
      destructiveButtonIndex: destructiveIdx,
      disabledButtonIndices: disabledIndices,
      userInterfaceStyle: 'dark',
    },
    (buttonIndex) => {
      if (buttonIndex === cancelIdx || buttonIndex === undefined) return;
      if (buttonIndex === 0 && canRename) {
        promptRename(notebook, callbacks.onRename);
      } else if (buttonIndex === 1) {
        pickThemeChange(notebook, callbacks.onChangeTheme);
      } else if (buttonIndex === 2 && canDelete) {
        showDeleteNotebookFlow(notebook, { onDelete: callbacks.onDelete });
      }
    },
  );
}

function promptRename(notebook: Notebook, onRename?: (id: string, name: string) => void) {
  if (!onRename) return;
  Alert.prompt(
    'Yeniden Adlandır',
    `"${notebook.name}" defterinin yeni adı`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaydet',
        onPress: (newName?: string) => {
          const trimmed = (newName ?? '').trim();
          if (trimmed.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onRename(notebook.id, trimmed.slice(0, 20));
        },
      },
    ],
    'plain-text',
    notebook.name,
    'default',
  );
}

function pickThemeChange(
  notebook: Notebook,
  onChange?: (id: string, themeId: ThemeId) => void,
) {
  if (!onChange) return;
  const themeOptions = [...THEMES.map((t) => t.label), 'Vazgeç'];
  const cancelIdx = themeOptions.length - 1;

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'Yeni Tema',
      message: `"${notebook.name}" için tema seç`,
      options: themeOptions,
      cancelButtonIndex: cancelIdx,
      userInterfaceStyle: 'dark',
    },
    (buttonIndex) => {
      if (buttonIndex === cancelIdx || buttonIndex === undefined) return;
      const themeId = THEMES[buttonIndex].id as ThemeId;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onChange(notebook.id, themeId);
    },
  );
}

// ─── Defter ekleme (4 adım: isim → silüet → tema → AI erişimi) ───────────────

/**
 * Yeni defter ekleme akışı tamamlandığında, kullanıcı tüm seçimleri yaptıktan
 * sonra `onSubmit` çağrılır. Bu callback genelde async olarak backend'e
 * `POST /notebooks` atar; başarısızsa sessizce hata döner (mobil tarafı toast/
 * alert göstermeyi üstlenir).
 *
 * Geriye uyumluluk: legacy `onAdd` parametresi hâlâ destekleniyor (eski client-
 * only akış). Yeni kod `onSubmit` kullanmalı.
 */
export interface AddNotebookCallbacks {
  onAdd?:    (notebook: Notebook) => void;
  onSubmit?: (input: {
    name:         string;
    silhouette:   Silhouette;
    themeId:      ThemeId;
    aiAccessible: boolean;
  }) => Promise<void> | void;
  onCancel?: () => void;
}

export function showAddNotebookFlow({ onAdd, onSubmit, onCancel }: AddNotebookCallbacks) {
  if (Platform.OS !== 'ios') {
    Alert.alert('Yakında', 'Defter ekleme şu an sadece iOS\'ta çalışıyor.');
    onCancel?.();
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // ─── Adım 1: İsim ────────────────────────────────────────────────────────
  Alert.prompt(
    'Defter ismi',
    'Defterine bir isim ver (en fazla 20 karakter).',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Devam',
        onPress: (rawName?: string) => {
          const name = (rawName ?? '').trim();
          if (name.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Hata', '❌ Defter adı boş olamaz.');
            onCancel?.();
            return;
          }
          pickSilhouetteForNew(name, { onAdd, onSubmit, onCancel });
        },
      },
    ],
    'plain-text',
    '',
    'default',
  );
}

// ─── Adım 2: Silüet ───────────────────────────────────────────────────────────

function pickSilhouetteForNew(name: string, callbacks: AddNotebookCallbacks) {
  const options = [...SILHOUETTES.map((s) => s.label), 'Vazgeç'];
  const cancelIdx = options.length - 1;

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'Defter görünüşü',
      message: `"${name}" defterinin sırt şekli`,
      options,
      cancelButtonIndex: cancelIdx,
      userInterfaceStyle: 'dark',
    },
    (buttonIndex) => {
      if (buttonIndex === cancelIdx || buttonIndex === undefined) {
        callbacks.onCancel?.();
        return;
      }
      const silhouette = SILHOUETTES[buttonIndex].id;
      pickThemeForNew(name, silhouette, callbacks);
    },
  );
}

// ─── Adım 3: Tema ─────────────────────────────────────────────────────────────

function pickThemeForNew(name: string, silhouette: Silhouette, callbacks: AddNotebookCallbacks) {
  const themeOptions = [...THEMES.map((t) => t.label), 'Vazgeç'];
  const cancelIdx = themeOptions.length - 1;

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'Renk teması',
      message: `"${name}" için bir renk teması seç`,
      options: themeOptions,
      cancelButtonIndex: cancelIdx,
      userInterfaceStyle: 'dark',
    },
    (buttonIndex) => {
      if (buttonIndex === cancelIdx || buttonIndex === undefined) {
        callbacks.onCancel?.();
        return;
      }
      const themeId = THEMES[buttonIndex].id as ThemeId;
      // ActionSheet kapanma animasyonunu bekle, sonra Alert aç —
      // aksi halde iOS'ta modal stack çakışması Alert'i sessizce yutabiliyor.
      setTimeout(() => {
        pickAiAccessForNew(name, silhouette, themeId, callbacks);
      }, 350);
    },
  );
}

// ─── Adım 4: AI erişimi (final) ───────────────────────────────────────────────

async function finalizeNewNotebook(
  input: { name: string; silhouette: Silhouette; themeId: ThemeId; aiAccessible: boolean },
  callbacks: AddNotebookCallbacks,
) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // Yeni API: backend'e gönderir, server gerçek id'yi atar
  if (callbacks.onSubmit) {
    await callbacks.onSubmit(input);
    return;
  }
  // Legacy: client-only — local state'e ekler
  if (callbacks.onAdd) {
    callbacks.onAdd(createCustomNotebook(input));
  }
}

function pickAiAccessForNew(
  name: string,
  silhouette: Silhouette,
  themeId: ThemeId,
  callbacks: AddNotebookCallbacks,
) {
  Alert.alert(
    'Lyra okuyabilsin mi?',
    '🤖 Evet seçersen Lyra bu defterdeki notları seans bağlamında kullanabilir. Hayır seçersen sadece sana özel kalır.',
    [
      {
        text: 'Hayır, bana özel olsun',
        style: 'cancel',
        onPress: () => {
          void finalizeNewNotebook(
            { name, silhouette, themeId, aiAccessible: false },
            callbacks,
          );
        },
      },
      {
        text: 'Evet, okuyabilir',
        onPress: () => {
          void finalizeNewNotebook(
            { name, silhouette, themeId, aiAccessible: true },
            callbacks,
          );
        },
      },
    ],
  );
}

// ─── Defter silme (Alert destructive onay) ──────────────────────────────────

export interface DeleteNotebookCallbacks {
  onDelete: (notebookId: string) => void;
  onCancel?: () => void;
}

export function showDeleteNotebookFlow(
  notebook: Notebook,
  { onDelete, onCancel }: DeleteNotebookCallbacks,
) {
  if (!canDeleteNotebook(notebook)) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sistem defteri',
      `🔒 "${notebook.name}" defteri silinemez. Yerine yeni bir defter ekleyebilirsin.`,
      [{ text: 'Tamam', style: 'default' }],
    );
    onCancel?.();
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Alert.alert(
    `"${notebook.name}" silinsin mi?`,
    '⚠️ Bu defter ve içindeki tüm girdiler kalıcı olarak silinecek. Bu işlem geri alınamaz.',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete(notebook.id);
        },
      },
    ],
  );
}
