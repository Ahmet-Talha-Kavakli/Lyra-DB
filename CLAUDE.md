# Lyra AI Therapist — Project Rules

## Wiki (ZORUNLU)

Proje wiki'si `~/Desktop/Lyra-Wiki/` konumunda tutulur.

### Kurallar:

1. **Her yeni sohbet başında** şu dosyaları oku:
   - `~/Desktop/Lyra-Wiki/overview.md`
   - `~/Desktop/Lyra-Wiki/index.md`
   - `~/Desktop/Lyra-Wiki/log.md` (son 5 entry)
   Bu adım atlanamaz. Wiki okunmadan kodla ilgili hiçbir işlem yapılmaz.

2. **Her kapsamlı değişiklik sonrası** wiki güncellenir. Kapsamlı değişiklik şunları içerir:
   - Yeni özellik ekleme
   - Bug fix (önemli olan)
   - Mimari karar
   - Refactor
   - Yeni modül veya paket
   İlgili entity/concept/decision sayfası güncellenir veya yoksa oluşturulur.

3. **Kullanıcı "wikiyi güncelle" dediğinde** mevcut konuşmada yapılan tüm değişiklikleri wiki'ye yansıt.

4. **Her wiki güncellemesinden sonra** `~/Desktop/Lyra-Wiki/log.md`'ye entry ekle.

5. **`~/Desktop/Lyra-Wiki/SCHEMA.md`** formatına uy — sayfa yapısı, frontmatter, link formatı.

6. **`~/Desktop/Lyra-Wiki/sources/`** içindeki ham dosyalara dokunma — sadece özet oluştur.

7. Wiki, koddan türetilemeyen bilgilerin tek kaynağıdır: mimari gerekçeler, trade-off'lar, kullanıcı kararları, araştırma bulguları.
