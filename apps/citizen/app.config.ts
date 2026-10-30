import type { ConfigContext, ExpoConfig } from 'expo/config';

const BRAND = '#0A3D3B';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Awaaz',
  slug: 'awaaz',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'awaaz',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  android: {
    package: 'com.awaaz.citizen',
    adaptiveIcon: {
      backgroundColor: BRAND,
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  ios: { bundleIdentifier: 'com.awaaz.citizen', supportsTablet: true },
  web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' },
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-secure-store',
    'expo-font',
    '@react-native-google-signin/google-signin',
    ['expo-audio', { microphonePermission: 'Allow Awaaz to record your spoken report.' }],
    ['expo-location', { locationWhenInUsePermission: 'Allow Awaaz to place your report on the map.' }],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Awaaz to attach a photo of the problem.',
        cameraPermission: 'Allow Awaaz to take a photo of the problem.',
      },
    ],
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' }],
  ],
});
