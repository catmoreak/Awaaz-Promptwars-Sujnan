import type { AuthResponse } from '@awaaz/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleButton, googleSignInAvailable } from '@/components/GoogleButton';
import { Body, Button, ErrorText, Hexagon, Muted } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { color, font } from '@/theme';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });

  const complete = async (login: Promise<AuthResponse>) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(await login);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.retry);
    } finally {
      setBusy(false);
    }
  };

  const demoEnabled = config.data?.demoLoginEnabled;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 16 }]}>
      <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.language}>
        <Text style={styles.languageText}>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</Text>
      </Pressable>

      <View style={styles.brand}>
        <Hexagon size={72} fill={color.mint} />
        <Text style={styles.title}>Awaaz</Text>
        <Text style={styles.tagline}>{t.tagline}</Text>
      </View>

      <View style={styles.panel}>
        <GoogleButton onIdToken={(idToken) => void complete(api.loginGoogle(idToken))} />
        {demoEnabled && (
          <>
            <Button kind={googleSignInAvailable ? 'quiet' : 'primary'} label={t.signInDemo} busy={busy} onPress={() => void complete(api.loginDemo())} />
            <Muted>{t.demoNote}</Muted>
          </>
        )}
        {config.isSuccess && !demoEnabled && !googleSignInAvailable && <Body>{t.signInUnavailable}</Body>}
        {config.isError && <ErrorText>{config.error.message}</ErrorText>}
        {error && <ErrorText>{error}</ErrorText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.monsoonDeep, flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  language: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  languageText: { color: '#FFFFFF', fontFamily: font.medium, fontSize: 16 },
  brand: { gap: 10 },
  title: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 52, lineHeight: 62 },
  tagline: { color: '#D8E8E5', fontFamily: font.regular, fontSize: 19, lineHeight: 27, maxWidth: 340 },
  panel: { backgroundColor: color.surface, borderRadius: 12, gap: 12, padding: 16 },
});
