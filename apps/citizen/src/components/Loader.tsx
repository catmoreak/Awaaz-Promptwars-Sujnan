import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { color } from '@/theme';

const PIN_PATH =
  'M32 2C16 2 4 14 4 30c0 21 28 48 28 48s28-27 28-48C60 14 48 2 32 2zm0 18a10 10 0 1 1 0 20 10 10 0 0 1 0-20z';

/** The same turning map pin as the website, built with native animation. */
export function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] });

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={fullScreen ? styles.full : styles.inline}>
      <Animated.View style={{ transform: [{ perspective: 420 }, { translateY }, { rotateY }] }}>
        <Svg width={60} height={75} viewBox="0 0 64 80">
          <Path d={PIN_PATH} fill={color.monsoon} fillRule="evenodd" />
        </Svg>
      </Animated.View>
      <View style={styles.tile}>
        <Svg width={52} height={20} viewBox="0 0 100 38">
          <Polygon points="50,0 100,10 100,28 50,38 0,28 0,10" fill={color.ink} opacity={0.14} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignItems: 'center', backgroundColor: color.rain, flex: 1, justifyContent: 'center' },
  inline: { alignItems: 'center', paddingVertical: 24 },
  tile: { marginTop: 8 },
});
