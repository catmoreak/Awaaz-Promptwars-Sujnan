import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ErrorText, Heading, Hexagon, Muted } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { color, font } from '@/theme';

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={color.inkFaint} style={styles.input} {...props} />
    </View>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const { signIn } = useSession();

  const [registering, setRegistering] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const auth = registering
        ? await api.register({ name, phone, password, addressLine, locality, pincode })
        : await api.login({ phone, password });
      await signIn(auth);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.retry);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setError(null);
    setRegistering((current) => !current);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.language}>
          <Text style={styles.languageText}>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</Text>
        </Pressable>

        <View style={styles.brand}>
          <Hexagon size={registering ? 44 : 64} fill={color.mint} />
          <Text style={styles.title}>Awaaz</Text>
          {!registering && <Text style={styles.tagline}>{t.tagline}</Text>}
        </View>

        <View style={styles.panel}>
          <Heading>{registering ? t.register : t.signIn}</Heading>

          {registering && <Field label={t.fullName} autoComplete="name" onChangeText={setName} textContentType="name" value={name} />}
          <Field label={t.phone} autoComplete="tel" inputMode="tel" keyboardType="phone-pad" onChangeText={setPhone} textContentType="telephoneNumber" value={phone} />
          <View style={styles.field}>
            <Field
              label={t.password}
              autoCapitalize="none"
              autoComplete={registering ? 'new-password' : 'current-password'}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={registering ? 'newPassword' : 'password'}
              value={password}
            />
            {registering && <Muted>{t.passwordHint}</Muted>}
          </View>

          {registering && (
            <>
              <Heading style={styles.subheading}>{t.homeAddress}</Heading>
              <Muted>{t.addressHint}</Muted>
              <Field label={t.addressLine} autoComplete="street-address" onChangeText={setAddressLine} value={addressLine} />
              <Field label={t.locality} onChangeText={setLocality} value={locality} />
              <Field label={t.pincode} autoComplete="postal-code" inputMode="numeric" keyboardType="number-pad" maxLength={6} onChangeText={setPincode} value={pincode} />
            </>
          )}

          {error && <ErrorText>{error}</ErrorText>}
          <Button
            busy={busy}
            label={busy ? (registering ? t.registering : t.signingIn) : registering ? t.register : t.signIn}
            onPress={() => void submit()}
          />
          <Button kind="quiet" label={registering ? t.haveAccount : t.needAccount} onPress={switchMode} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.monsoonDeep, flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, gap: 20, justifyContent: 'space-between', maxWidth: 520, paddingHorizontal: 20, width: '100%' },
  language: { alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  languageText: { color: '#FFFFFF', fontFamily: font.medium, fontSize: 16 },
  brand: { gap: 8 },
  title: { color: '#FFFFFF', fontFamily: font.bold, fontSize: 46, lineHeight: 56 },
  tagline: { color: '#D8E8E5', fontFamily: font.regular, fontSize: 19, lineHeight: 27, maxWidth: 340 },
  panel: { backgroundColor: color.surface, borderRadius: 12, gap: 12, padding: 16 },
  subheading: { fontSize: 17, marginTop: 6 },
  field: { gap: 4 },
  label: { color: color.ink, fontFamily: font.medium, fontSize: 15 },
  input: {
    backgroundColor: color.surface,
    borderColor: '#B3C4C1',
    borderRadius: 8,
    borderWidth: 1,
    color: color.ink,
    fontFamily: font.regular,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
});
