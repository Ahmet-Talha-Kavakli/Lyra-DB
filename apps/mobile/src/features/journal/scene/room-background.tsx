import { Dimensions } from 'react-native';
import { Image } from 'expo-image';

const { height: SCREEN_H } = Dimensions.get('window');
// Height-fit scale: görsel 1320×2868, ekrana yükseklik bazlı sığdır
const SCALE     = SCREEN_H / 2868;
const RENDER_W  = 1320 * SCALE;

export function RoomBackground() {
  return (
    <Image
      source={require('../../../../assets/journal/scene.png')}
      style={{ position: 'absolute', left: 0, top: 0, width: RENDER_W, height: SCREEN_H }}
      contentFit="fill"
      cachePolicy="memory-disk"
      priority="high"
    />
  );
}
