# Lyra Journal — Mobile Design Spec

> Status: 2026-04-30 — geçerli mimari (Faz 7).

## Mimari

Journal sekmesi tek bir AI üretimi sahne görseli (`assets/journal/scene.png`, 1536×2720) üzerine **Skia defter overlay** kompozisyonudur. Kitaplık, saksılar, kedi, lamba ve oda sahne görselinin parçası — kod onlara dokunmaz.

```text
apps/mobile/src/features/journal/
├── scene/
│   └── room-background.tsx      # scene.png full-screen
├── notebook-spine.tsx           # Pixar şişko defter sırtı (Skia)
├── notebooks.ts                 # tema, kalınlık, system defterler
├── notebook-flows.ts            # iOS native akışlar (ekleme, context menu, sil)
├── secret-notebook-flow.ts      # Face ID + PIN (Gizli defter)
├── page-curl.tsx                # Sayfa kıvrılma animasyonu (Skia)
└── library-shelf.tsx            # Sahne kompozisyonu (entry)
```

## Sahne ölçümleri (görsel-piksel uzayı, 1536×2720)

Tek kaynak. Ekran-uzayına dönüşüm: `pt = px × (SCREEN_H / 2720)` — bütün cihazlarda aynı kompozisyon.

| Yer             | Sol iç duvar | Sağ iç duvar | Taban Y | İç yükseklik |
| --------------- | ------------ | ------------ | ------- | ------------ |
| Raf 2 (üst boş) | 182          | 744          | 1445    | 351          |
| Raf 3 (alt boş) | 182          | 744          | 1809    | 328          |

iPhone 17 Pro (402×874pt) örneği: SCALE=0.3213, raf iç genişlik 180.6pt, raf 2 taban 464pt, raf 3 taban 581pt.

## Defter dağıtımı

**Raf 2 (üst boş, 3 custom slot):**

- Sağa yaslı, birbirine yaslanmış. En sağdaki dik (rotate 0°), ortadaki -3°, soldaki -6°.
- Sıralı kilit: kullanıcı önce en sağdaki slotu doldurur. Sıradaki + ikonu ondan sonra aktifleşir.
- Boş slotta sadece küçük + ikonu (16pt circle, krem 50% opacity, 44pt tap area). Eski dotted EmptySpine kaldırıldı.

**Raf 3 (alt boş, 2 system defter):**

- "Günlük" (J harfi) + "Secret" (Secret yazılı). İkisi de sağa yaslı, dik (ikincisi -3° yaslı).
- Silinemez, yeniden adlandırılamaz. Tema değiştirilebilir.
- Cilt yazısı için Caveat_700Bold (sahnedeki kitap aksesuarlarıyla uyumlu sıcak el-yazısı font).

## Defter modeli

```ts
type Notebook = {
  id: string
  type: 'standard' | 'private' | 'custom'
  name: string                  // 'Günlük' | 'Secret' | custom (max 20)
  themeId: ThemeId              // 7 tema
  thicknessId: 'slim' | 'thick' // 2 seçenek
  locked: boolean               // private her zaman true
  aiAccessible: boolean         // standard true, private false, custom kullanıcı seçer
  createdAt: string
}
```

`MAX_NOTEBOOKS = 5` (3 custom + 2 system). Max raf 2 dolduğunda `+` ikonları kaybolur.

### Kalınlık görsel ayrımı (gerçekten farklı görünmeli)

| ID    | Genişlik (pt @17 Pro) | Sayfa kenarı katmanı            | Sağ inner shadow |
| ----- | --------------------- | ------------------------------- | ---------------- |
| slim  | 32                    | 1 ince çizgi                    | 0.4α             |
| thick | 50                    | 3 yatay katman + sayfa blokları | 0.85α            |

Mevcut `notebook-spine.tsx`'in 9 katmanlı Pixar puffy yapısı korunur. Yeni `lean` prop rotation pivot tabanı sol-alt köşede.

## iOS native akışlar (yeni paket eklenmedi)

### Yeni defter ekleme (sıra önemli)

1. `+` tap → haptic Light
2. **`Alert.alert` — "Yapay zekam bu defteri okuyabilsin mi?"** [Evet, okuyabilsin] / [Hayır, sadece bana özel]
3. **`Alert.prompt` — Defter ismi** (max 20 char)
4. **`ActionSheetIOS` — Tema** (7 seçenek + Vazgeç)
5. **`ActionSheetIOS` — Kalınlık** ("İnce" / "Kalın" + Vazgeç)
6. Haptic Success → state'e ekle → `SpineAnimated` staggered düşer

### Long-press context menu

- **Custom defter:** ActionSheet — Yeniden Adlandır / Tema Değiştir / Sil (destructive)
- **Günlük & Secret:** ActionSheet — Tema Değiştir (rename + sil disabled)

### Silme akışı (iOS ActionSheet + Alert destructive onayı)

1. Long-press → context menu → "Sil" tap
2. `Alert.alert` destructive: "Bu defteri sil?" → "Vazgeç" / "Sil" (red)
3. Onay → haptic Warning → state'ten kaldır → spine fade-out

### Tema değiştirme

`ActionSheetIOS` ile 7 tema seçenek. System defterler için de aynı akış.

### Gizli defter açma (mevcut, korundu)

Face ID → fallback `Alert.prompt` PIN → ekran açılır.

## Performance & teknik notlar

- Tek `Canvas` per spine (en fazla 5 spine). 60fps sürdürülür.
- Sahne PNG `expo-image` `cachePolicy="memory-disk"` ile.
- Asset değişiminde Metro `--clear` zorunlu (cache problemi önlenir).
- Görsel-piksel sabitleri tek kaynaktan türetilir; cihaza-bağımlı `NW/NH` normalizer kaldırıldı.

## İlgili sayfalar

- [[concepts/journal-scene-architecture]]
- [[entities/journal-module]]
- [[decisions/adr-003-journal-pixar-aesthetic]]
