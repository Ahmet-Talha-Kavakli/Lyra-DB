import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Host,
  BottomSheet,
  Form,
  Section,
  Picker,
  Text,
  TextField,
  Button,
  HStack,
  Spacer,
} from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { IPainEntry, TPainType } from '@ai-therapist/types';
import {
  intensityToBucket,
  bucketToIntensity,
  type SeverityBucket,
} from './bloom-pain-map';


const TYPE_LABEL: Record<TPainType, string> = {
  cramp:     'Kramp',
  ache:      'Sızı',
  sharp:     'Keskin',
  dull:      'Donuk',
  throbbing: 'Zonklayan',
};

const TYPE_VALUES: TPainType[] = ['cramp', 'ache', 'sharp', 'dull', 'throbbing'];
const SEVERITY_BUCKETS: SeverityBucket[] = [1, 2, 3, 4];
const SEVERITY_LABEL: Record<SeverityBucket, string> = {
  1: 'Hafif',
  2: 'Orta',
  3: 'Ciddi',
  4: 'Çok ciddi',
};

interface RegionMarkSheetProps {
  visible: boolean;
  title: string;
  existing: IPainEntry | null;
  onCancel: () => void;
  onSave: (input: { type: TPainType; intensity: number; note?: string }) => void;
  onDelete: () => void;
}

export function RegionMarkSheet({
  visible,
  title,
  existing,
  onCancel,
  onSave,
  onDelete,
}: RegionMarkSheetProps) {
  const [type, setType] = useState<TPainType>('cramp');
  const [bucket, setBucket] = useState<SeverityBucket>(2);
  const [note, setNote] = useState('');

  // Sheet açıldığında hydrate
  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setType((existing.type ?? 'cramp') as TPainType);
      setBucket(intensityToBucket(existing.intensity));
      setNote(existing.note ?? '');
    } else {
      setType('cramp');
      setBucket(2);
      setNote('');
    }
  }, [visible, existing]);

  function handleSave() {
    onSave({
      type,
      intensity: bucketToIntensity(bucket),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  }

  return (
    <Host matchContents style={styles.host}>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onCancel();
        }}
      >
        <Form>
          {/* Header — İptal / Title / Kaydet */}
          <Section>
            <HStack>
              <Button label="İptal" onPress={onCancel} />
              <Spacer />
              <Text>{title}</Text>
              <Spacer />
              <Button label="Kaydet" onPress={handleSave} />
            </HStack>
          </Section>

          {/* TÜR — navigation link picker (SwiftUI native) */}
          <Section title="Tür">
            <Picker
              label="Tür"
              selection={type}
              onSelectionChange={(t) => setType(t as TPainType)}
              modifiers={[pickerStyle('navigationLink')]}
            >
              {TYPE_VALUES.map((v) => (
                <Text key={v} modifiers={[tag(v)]}>
                  {TYPE_LABEL[v]}
                </Text>
              ))}
            </Picker>
          </Section>

          {/* ŞİDDET — segmented picker */}
          <Section title="Şiddet">
            <Picker
              label="Şiddet"
              selection={bucket}
              onSelectionChange={(b) => setBucket(b as SeverityBucket)}
              modifiers={[pickerStyle('segmented')]}
            >
              {SEVERITY_BUCKETS.map((b) => (
                <Text key={b} modifiers={[tag(b)]}>
                  {SEVERITY_LABEL[b]}
                </Text>
              ))}
            </Picker>
          </Section>

          {/* NOT — multiline TextField */}
          <Section title="Not">
            <TextField
              defaultValue={note}
              placeholder="İsteğe bağlı not ekle"
              onValueChange={setNote}
              axis="vertical"
            />
          </Section>

          {/* İşareti kaldır — sadece existing varsa */}
          {existing && (
            <Section>
              <Button label="İşareti kaldır" role="destructive" onPress={onDelete} />
            </Section>
          )}
        </Form>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
