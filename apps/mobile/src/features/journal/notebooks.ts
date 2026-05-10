/**
 * Notebook tipleri ve tema tanımları (Faz 7).
 *
 * Kitaplık raf yerleşimi:
 *  - Raf 2 (üst boş, 3 custom slot, sağa yaslı, sıralı kilit)
 *  - Raf 3 (alt boş, 2 system defter):
 *      • "Günlük" — terra teması, AI okuyabilir, J cilt yazısı
 *      • "Secret" — midnight teması, şifreli, AI okuyamaz, "Secret" cilt yazısı
 *
 * MAX_NOTEBOOKS = 5 (3 custom + 2 system).
 *
 * NOT: Şu an frontend tip + dummy data. Backend Notebook tablosu sonraki sprintte.
 */

// ─── Temalar (13 adet — açık + koyu paletler) ─────────────────────────────────
// Her tema şu renklerden oluşur:
//   spine     → defter sırtının ana rengi (kullanıcının kitaplıkta gördüğü)
//   spineDeep → sırtın üst/alt şeridi (gradient için koyu ton)
//   detail    → yan çizgi/çerçeve/monogram (otomatik kontrast)
//   cover     → kapak ana rengi (defter açılınca arka plan)
//   page      → sayfa rengi (yazı zemini)
//   line      → çizgili sayfanın yatay çizgi rengi
//   accent    → tarih / vurgu rengi (margin çizgisi, ribbon, vb.)
//   text      → ana yazı rengi (entry textInput) — koyu temalarda krem
//   textSoft  → alt yazı / page number — text'in soluk versiyonu
//
// 7 canlı tema (orijinal palet) + 6 koyu/erkeksi tema (lacivert, antrasit,
// bordo, çam, ceviz, siyah). Koyu temalarda hem cover hem page koyu, yazı krem.

export const THEMES = [
  {
    id: 'sunshine',
    label: 'Sarı',
    spine:     '#F4C842',
    spineDeep: '#A07820',
    detail:    '#5A3A0A',
    cover:     '#F4C842',
    page:      '#FFF8E0',
    line:      '#D8B860',
    accent:    '#A07820',
    text:      '#2A1A08',
    textSoft:  '#6A4A20',
  },
  {
    id: 'azure',
    label: 'Mavi',
    spine:     '#3F8CA8',
    spineDeep: '#1F4E63',
    detail:    '#E0CC9E',
    cover:     '#3F8CA8',
    page:      '#EFF6FF',
    line:      '#A8C8E0',
    accent:    '#1F4E63',
    text:      '#1A2A3A',
    textSoft:  '#4A6A88',
  },
  {
    id: 'forest',
    label: 'Yeşil',
    spine:     '#7B9148',
    spineDeep: '#4A5A28',
    detail:    '#E0CC9E',
    cover:     '#7B9148',
    page:      '#F4F8E8',
    line:      '#B8C898',
    accent:    '#4A5A28',
    text:      '#1F2A18',
    textSoft:  '#5A6A40',
  },
  {
    id: 'amber',
    label: 'Turuncu',
    spine:     '#E07A2C',
    spineDeep: '#9A4810',
    detail:    '#5A2818',
    cover:     '#E07A2C',
    page:      '#FFF2E0',
    line:      '#E8B888',
    accent:    '#9A4810',
    text:      '#3A1A08',
    textSoft:  '#7A4818',
  },
  {
    id: 'violet',
    label: 'Mor',
    spine:     '#7B5DA8',
    spineDeep: '#4A3568',
    detail:    '#E0CC9E',
    cover:     '#7B5DA8',
    page:      '#F4F0FA',
    line:      '#C0B0D8',
    accent:    '#4A3568',
    text:      '#2A1F40',
    textSoft:  '#6A5A88',
  },
  {
    id: 'rose',
    label: 'Pembe',
    spine:     '#D2547A',
    spineDeep: '#8A2848',
    detail:    '#E0CC9E',
    cover:     '#D2547A',
    page:      '#FFF0F4',
    line:      '#E8B8C8',
    accent:    '#8A2848',
    text:      '#3A1A28',
    textSoft:  '#7A4858',
  },
  {
    id: 'ivory',
    label: 'Kemik',
    spine:     '#E6CC8C',
    spineDeep: '#A88040',
    detail:    '#5A3818',
    cover:     '#E6CC8C',
    page:      '#FAF4E0',
    line:      '#D8C098',
    accent:    '#A88040',
    text:      '#3A2A10',
    textSoft:  '#7A5A28',
  },

  // ─── Koyu temalar — sayfa zemin koyu, yazı krem ────────────────────────────
  {
    id: 'midnight',
    label: 'Lacivert',
    spine:     '#1F3A5F',
    spineDeep: '#0A1F3D',
    detail:    '#E0CC9E',
    cover:     '#1F3A5F',
    page:      '#1A2C45',          // koyu lacivert sayfa
    line:      'rgba(245, 232, 200, 0.18)',
    accent:    '#E0CC9E',           // krem accent (header, ribbon)
    text:      '#F5E8C8',           // krem yazı
    textSoft:  'rgba(245, 232, 200, 0.55)',
  },
  {
    id: 'charcoal',
    label: 'Antrasit',
    spine:     '#2E2E33',
    spineDeep: '#0F0F12',
    detail:    '#D8D2C0',
    cover:     '#2E2E33',
    page:      '#1F1F23',
    line:      'rgba(232, 224, 200, 0.16)',
    accent:    '#D8D2C0',
    text:      '#EDE6D2',
    textSoft:  'rgba(237, 230, 210, 0.55)',
  },
  {
    id: 'crimson',
    label: 'Bordo',
    spine:     '#7A1F2B',
    spineDeep: '#3A0E15',
    detail:    '#E8D0A8',
    cover:     '#7A1F2B',
    page:      '#3D1218',
    line:      'rgba(245, 232, 200, 0.18)',
    accent:    '#E8D0A8',
    text:      '#F5E8C8',
    textSoft:  'rgba(245, 232, 200, 0.55)',
  },
  {
    id: 'pine',
    label: 'Çam',
    spine:     '#2D4A3E',
    spineDeep: '#142820',
    detail:    '#D8C898',
    cover:     '#2D4A3E',
    page:      '#1A2E25',
    line:      'rgba(232, 220, 184, 0.18)',
    accent:    '#D8C898',
    text:      '#EDE0B8',
    textSoft:  'rgba(237, 224, 184, 0.55)',
  },
  {
    id: 'walnut',
    label: 'Ceviz',
    spine:     '#5C3A20',
    spineDeep: '#2E1808',
    detail:    '#E8D0A8',
    cover:     '#5C3A20',
    page:      '#2E1F12',
    line:      'rgba(245, 232, 200, 0.18)',
    accent:    '#E8D0A8',
    text:      '#F5E8C8',
    textSoft:  'rgba(245, 232, 200, 0.55)',
  },
  {
    id: 'obsidian',
    label: 'Siyah',
    spine:     '#16161A',
    spineDeep: '#000000',
    detail:    '#E8E4D4',
    cover:     '#16161A',
    page:      '#0F0F12',
    line:      'rgba(232, 224, 200, 0.14)',
    accent:    '#E8E4D4',
    text:      '#EDE6D2',
    textSoft:  'rgba(237, 230, 210, 0.50)',
  },
] as const;

export type Theme = typeof THEMES[number];
export type ThemeId = Theme['id'];

// ─── Defter Kalınlığı (2 seçenek — gerçek görsel ayrım) ─────────────────────
// Genişlik referans @iPhone 17 Pro (402×874pt). NotebookSpine `overrideWidth`
// ile rafa uygun ölçeklenir. Burada sadece görsel ayrım için relative bir
// `widthRatio` (sahne piksel uzayında raf iç genişliğine oran) tutuyoruz.

export const THICKNESSES = [
  {
    id: 'slim',
    label: 'İnce',
    /** Raf iç genişliğinin oranı (562px raf için → 101px = ~32pt @17 Pro) */
    widthRatio: 0.18,
    /** Sayfa kenarı katmanı sayısı (notebook-spine'da kullanılır) */
    pageLayers: 1,
    /** Sağ inner shadow opacity'si */
    rightShadowAlpha: 0.4,
  },
  {
    id: 'thick',
    label: 'Kalın',
    /** Raf iç genişliğinin oranı (562px raf için → 157px = ~50pt @17 Pro) */
    widthRatio: 0.28,
    /** 3 yatay sayfa kenarı katmanı + sayfa blokları */
    pageLayers: 3,
    rightShadowAlpha: 0.85,
  },
] as const;

export type Thickness = typeof THICKNESSES[number];
export type ThicknessId = Thickness['id'];

// ─── Notebook ────────────────────────────────────────────────────────────────

export type NotebookType = 'standard' | 'private' | 'custom';

/** Defter sırt silüeti — kullanıcı custom defter eklerken seçer. */
export type Silhouette = 'classic' | 'arched' | 'pointed';

export interface Notebook {
  id: string;
  type: NotebookType;
  name: string;
  themeId: ThemeId;
  thicknessId: ThicknessId;
  /**
   * Sırt silüeti. Sistem defterler:
   *  - 'standard' (Journal) → 'classic' (otomatik render bu)
   *  - 'private'  (Secret)  → 'arched'  (otomatik render bu)
   * Custom: kullanıcı seçer.
   */
  silhouette: Silhouette;
  /** Şifre korumalı mı? (private her zaman true; custom hep false) */
  locked: boolean;
  /** AI bu defteri okuyabilir mi? (standard true, private false, custom kullanıcı seçer) */
  aiAccessible: boolean;
  /** ISO timestamp — eklenme sırası için */
  createdAt: string;
}

// Sistem defterleri — her zaman var, silinmez/rename edilmez.
// Sırt görünümü kendi PALETTE'siyle çiziliyor (system-notebook-spine.tsx);
// themeId sadece defter İÇERİĞİ açıldığında sayfa renkleri için kullanılır.
export const SYSTEM_NOTEBOOKS: Notebook[] = [
  {
    id: 'standard',
    type: 'standard',
    name: 'Journal',
    themeId: 'amber',     // sıcak turuncu içerik
    thicknessId: 'thick',
    silhouette: 'classic',
    locked: false,
    aiAccessible: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'private',
    type: 'private',
    name: 'Secret',
    themeId: 'azure',     // koyu mavi içerik (Secret'ın gizli/serin tonu)
    thicknessId: 'thick',
    silhouette: 'arched',
    locked: true,
    aiAccessible: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/** Backwards-compat alias — eski kod hâlâ DUMMY_NOTEBOOKS import ediyor. */
export const DUMMY_NOTEBOOKS = SYSTEM_NOTEBOOKS;

export const MAX_NOTEBOOKS = 5;
export const MAX_CUSTOM_NOTEBOOKS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id)!;
}

/** Sayfa zemini koyu mu? Mikrofon FAB / Lyra butonu kontrast için kullanır. */
const DARK_THEME_IDS = new Set<ThemeId>([
  'midnight', 'charcoal', 'crimson', 'pine', 'walnut', 'obsidian',
]);

export function isDarkTheme(id: ThemeId): boolean {
  return DARK_THEME_IDS.has(id);
}

export function getThickness(id: ThicknessId): Thickness {
  return THICKNESSES.find((t) => t.id === id)!;
}

/** Yeni custom defter oluştur. Custom defterler kilitlenemez (sadece Secret). */
export function createCustomNotebook(input: {
  name: string;
  silhouette: Silhouette;
  themeId: ThemeId;
  aiAccessible: boolean;
}): Notebook {
  return {
    id: `custom-${Date.now()}`,
    type: 'custom',
    name: input.name.trim().slice(0, 20),
    themeId: input.themeId,
    thicknessId: 'thick',          // tek default (artık seçim yok)
    silhouette: input.silhouette,
    locked: false,                 // custom defterler kilitlenemez
    aiAccessible: input.aiAccessible,
    createdAt: new Date().toISOString(),
  };
}

/** Bir defterin silinebilir olup olmadığı. Sistem defterleri silinemez. */
export function canDeleteNotebook(notebook: Notebook): boolean {
  return notebook.type === 'custom';
}

/** Bir defterin yeniden adlandırılabilir olup olmadığı. Sistem defterleri rename edilemez. */
export function canRenameNotebook(notebook: Notebook): boolean {
  return notebook.type === 'custom';
}
