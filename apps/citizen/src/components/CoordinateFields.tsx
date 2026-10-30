import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLanguage } from '@/lib/i18n';
import { color, font } from '@/theme';
import { Muted } from './ui';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
}

/** Keeps reporting possible in a build with no maps key, instead of showing a blank map. */
export function CoordinateFields({ value, onChange }: MapPickerProps) {
  const { t } = useLanguage();
  const [lat, setLat] = useState(value ? String(value.lat) : '');
  const [lng, setLng] = useState(value ? String(value.lng) : '');

  useEffect(() => {
    if (!value) return;
    setLat(String(value.lat));
    setLng(String(value.lng));
  }, [value]);

  const commit = (nextLat: string, nextLng: string) => {
    const parsedLat = Number(nextLat);
    const parsedLng = Number(nextLng);
    if (nextLat && nextLng && Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
      onChange({ lat: parsedLat, lng: parsedLng });
    }
  };

  return (
    <View style={styles.wrap}>
      <Muted>{t.mapOff}</Muted>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={t.latitude}
          keyboardType="decimal-pad"
          onChangeText={setLat}
          onEndEditing={() => commit(lat, lng)}
          onBlur={() => commit(lat, lng)}
          placeholder={t.latitude}
          placeholderTextColor={color.inkFaint}
          style={styles.input}
          value={lat}
        />
        <TextInput
          accessibilityLabel={t.longitude}
          keyboardType="decimal-pad"
          onChangeText={setLng}
          onEndEditing={() => commit(lat, lng)}
          onBlur={() => commit(lat, lng)}
          placeholder={t.longitude}
          placeholderTextColor={color.inkFaint}
          style={styles.input}
          value={lng}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: color.surface,
    borderColor: color.line,
    borderRadius: 8,
    borderWidth: 1,
    color: color.ink,
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 12,
  },
});
