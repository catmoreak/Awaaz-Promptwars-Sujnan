import { SERVICE_AREA } from '@awaaz/shared';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CoordinateFields, type MapPickerProps } from './CoordinateFields';

const MAPS_ENABLED = process.env.EXPO_PUBLIC_ANDROID_MAPS_ENABLED === 'true';

export function MapPicker({ value, onChange }: MapPickerProps) {
  if (!MAPS_ENABLED) return <CoordinateFields value={value} onChange={onChange} />;

  const center = value ?? SERVICE_AREA;
  return (
    <View style={styles.frame}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        region={value ? { latitude: value.lat, longitude: value.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 } : undefined}
        onPress={({ nativeEvent }) => onChange({ lat: nativeEvent.coordinate.latitude, lng: nativeEvent.coordinate.longitude })}
      >
        {value && (
          <Marker
            draggable
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            onDragEnd={({ nativeEvent }) => onChange({ lat: nativeEvent.coordinate.latitude, lng: nativeEvent.coordinate.longitude })}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 8, height: 240, overflow: 'hidden' },
});
