import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useState } from 'react';
import { Text } from 'react-native';
import { useLanguage } from '@/lib/i18n';
import { color, font } from '@/theme';
import { Button } from './ui';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
// Expo Go does not include this native module, so it must never be imported there.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const googleSignInAvailable = Boolean(WEB_CLIENT_ID) && !IS_EXPO_GO;

export function GoogleButton({ onIdToken }: { onIdToken: (idToken: string) => void }) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  if (!googleSignInAvailable) return null;

  const signIn = async () => {
    setError(null);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type === 'success' && response.data.idToken) onIdToken(response.data.idToken);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Google Sign-In did not complete. Try again.');
    }
  };

  return (
    <>
      <Button label={t.signInGoogle} onPress={() => void signIn()} />
      {error && <Text style={{ color: color.critical, fontFamily: font.regular }}>{error}</Text>}
    </>
  );
}
