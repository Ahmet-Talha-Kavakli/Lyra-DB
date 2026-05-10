import {
  Canvas, Group, Image, Path, Skia,
  LinearGradient, vec,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  useDerivedValue, type SharedValue,
} from 'react-native-reanimated';

/**
 * PageCurl — sayfa köşesinden kıvrılan kitap-sayfa-çevirme animasyonu.
 *
 * Klasik "fold-line reflection" tekniği: sayfa hayali bir dikey fold
 * çizgisine göre yansıtılır. Fold çizgisi `progress` (0→1) ile sayfa
 * üzerinde ilerler. Kıvrılan parça yansıtılmış olarak çizilir.
 *
 * `progress` dışarıdan SharedValue olarak verilir, böylece hem buton
 * (withTiming) hem de gesture (parmak hareketi) aynı animasyonu sürer.
 *
 * - `oldImage`: çevrilen sayfanın görüntüsü (üstte, kıvrılan)
 * - `newImage`: arkadan görünecek hedef sayfa (altta, sabit)
 * - `direction`: 1 = sağdan-sola çevir (sonraki), -1 = soldan-sağa (önceki)
 */
export function PageCurl({
  width, height, oldImage, newImage, direction, progress,
}: {
  width: number;
  height: number;
  oldImage: SkImage;
  newImage: SkImage;
  direction: 1 | -1;
  progress: SharedValue<number>;
}) {
  // p: yön-normalize edilmiş progress (0 = düz, 1 = tamamen çevrilmiş).
  // Direction 1 (next): sağdan-sola, foldX = width * (1 - p)
  // Direction -1 (prev): soldan-sağa, foldX = width * p
  // Her iki yönde de "henüz kıvrılmamış" alan bir tarafta, kıvrılan diğer tarafta.

  // Üst (henüz kıvrılmamış) sayfa için clip path
  const topClipPath = useDerivedValue(() => {
    const p = progress.value;
    const foldX = direction === 1 ? width * (1 - p) : width * p;
    const path = Skia.Path.Make();
    if (direction === 1) {
      path.addRect(Skia.XYWHRect(0, 0, foldX, height));
    } else {
      path.addRect(Skia.XYWHRect(foldX, 0, width - foldX, height));
    }
    return path;
  });

  // Kıvrılan parça için clip path (yansıtılmış bölge)
  const curledPath = useDerivedValue(() => {
    const p = progress.value;
    const foldX = direction === 1 ? width * (1 - p) : width * p;
    const path = Skia.Path.Make();
    if (direction === 1) {
      // Yansıma mesafesi = (width - foldX); fold'un solundan itibaren bu kadar
      const reflectStart = Math.max(0, foldX - (width - foldX));
      path.addRect(Skia.XYWHRect(reflectStart, 0, foldX - reflectStart, height));
    } else {
      const reflectEnd = Math.min(width, foldX + foldX);
      path.addRect(Skia.XYWHRect(foldX, 0, reflectEnd - foldX, height));
    }
    return path;
  });

  // Kıvrılan parçanın transform: foldX ekseni etrafında yatay yansıma
  // x' = 2*foldX - x → translate(2*foldX) sonra scaleX(-1)
  const curlTransform = useDerivedValue(() => {
    const p = progress.value;
    const foldX = direction === 1 ? width * (1 - p) : width * p;
    return [
      { translateX: 2 * foldX },
      { scaleX: -1 },
    ];
  });

  // Fold çizgisi gradient noktaları (kıvrılma derinliğine göre kaydırılır)
  const foldGradStart = useDerivedValue(() => {
    const p = progress.value;
    const foldX = direction === 1 ? width * (1 - p) : width * p;
    return vec(foldX - 14 * direction, 0);
  });
  const foldGradEnd = useDerivedValue(() => {
    const p = progress.value;
    const foldX = direction === 1 ? width * (1 - p) : width * p;
    return vec(foldX + 14 * direction, 0);
  });

  // Yeni sayfa üzerinde fold-altı gölgesi (curl'ün altına düşen gölge)
  const underShadowOpacity = useDerivedValue(() => {
    return Math.min(0.55, progress.value * 0.85);
  });

  return (
    <Canvas style={{ width, height }}>
      {/* Alt katman: yeni sayfa (sabit) */}
      <Image image={newImage} x={0} y={0} width={width} height={height} fit="fill" />

      {/* Kıvrılan parçanın altına düşen koyu gölge — yeni sayfa üzerinde */}
      <Group clip={curledPath} opacity={underShadowOpacity}>
        <Path path={curledPath}>
          <LinearGradient
            start={foldGradStart}
            end={foldGradEnd}
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
          />
        </Path>
      </Group>

      {/* Üst katman: eski sayfanın henüz kıvrılmamış kısmı */}
      <Group clip={topClipPath}>
        <Image image={oldImage} x={0} y={0} width={width} height={height} fit="fill" />
      </Group>

      {/* Kıvrılan kısım: eski sayfanın yansıtılmış görüntüsü (sayfanın "arkası") */}
      <Group clip={curledPath} transform={curlTransform}>
        <Image image={oldImage} x={0} y={0} width={width} height={height} fit="fill" opacity={0.93} />
      </Group>

      {/* Kağıt arka yüzünün hafif "vellum" parlaklığı — fold yakınında */}
      <Group clip={curledPath} opacity={0.22}>
        <Path path={curledPath}>
          <LinearGradient
            start={foldGradStart}
            end={foldGradEnd}
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
          />
        </Path>
      </Group>
    </Canvas>
  );
}
