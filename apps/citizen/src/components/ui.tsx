import type { PriorityResult } from '@awaaz/shared';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { bandColor, color, font } from '@/theme';

export function Hexagon({ size, fill }: { size: number; fill: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" fill={fill} />
    </Svg>
  );
}

export function Body({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, style]} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.body, styles.muted, style]} />;
}

export function Heading({ style, ...props }: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[styles.heading, style]} />;
}

export function ErrorText({ style, ...props }: TextProps) {
  return <Text accessibilityRole="alert" {...props} style={[styles.body, styles.error, style]} />;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet';
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({ label, onPress, kind = 'primary', disabled, busy, icon, style }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.quiet,
        pressed && styles.pressed,
        (disabled || busy) && styles.disabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={primary ? color.onAccent : color.ink} size="small" /> : icon}
      <Text style={[styles.buttonLabel, { color: primary ? color.onAccent : color.ink }]}>{label}</Text>
    </Pressable>
  );
}

const BAND_NAMES: Record<PriorityResult['band'], string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export function BandLabel({ band }: { band: PriorityResult['band'] }) {
  return <Text style={[styles.band, { color: bandColor[band] }]}>{BAND_NAMES[band]}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  body: { color: color.ink, fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  muted: { color: color.inkSoft, fontSize: 14, lineHeight: 20 },
  heading: { color: color.ink, fontFamily: font.semibold, fontSize: 19, lineHeight: 25 },
  error: { color: color.critical, fontFamily: font.medium, fontSize: 15 },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: color.monsoon },
  quiet: { backgroundColor: color.surface, borderColor: color.line, borderWidth: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  buttonLabel: { fontFamily: font.semibold, fontSize: 16 },
  band: { fontFamily: font.semibold, fontSize: 14 },
  divider: { backgroundColor: color.line, height: 1 },
});
