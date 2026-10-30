import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebHome, hasWebHome } from '@/components/WebHome';
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

  const [formOpen, setFormOpen] = useState(!hasWebHome);
  const [registering, setRegistering] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openForm = (asRegistration: boolean) => {
    setRegistering(asRegistration);
    setError(null);
    setFormOpen(true);
  };

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

  const form = (
    <View style={styles.form}>
      <Heading style={styles.title}>{registering ? t.register : t.signIn}</Heading>

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
          <View style={styles.intro}>
            <Heading style={styles.subheading}>{t.homeAddress}</Heading>
            <Muted>{t.addressHint}</Muted>
          </View>
          <Field label={t.addressLine} autoComplete="street-address" onChangeText={setAddressLine} value={addressLine} />
          <View style={styles.row}>
            <View style={styles.grow}>
              <Field label={t.locality} onChangeText={setLocality} value={locality} />
            </View>
            <View style={styles.grow}>
              <Field label={t.pincode} autoComplete="postal-code" inputMode="numeric" keyboardType="number-pad" maxLength={6} onChangeText={setPincode} value={pincode} />
            </View>
          </View>
        </>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <Button
        busy={busy}
        label={busy ? (registering ? t.registering : t.signingIn) : registering ? t.register : t.signIn}
        onPress={() => void submit()}
      />
      <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
        <Text style={styles.switchText}>{registering ? t.haveAccount : t.needAccount}</Text>
      </Pressable>
    </View>
  );

  if (hasWebHome) {
    return (
      <WebHome onSignIn={() => openForm(false)} onRegister={() => openForm(true)} onHome={() => setFormOpen(false)}>
        {formOpen ? form : null}
      </WebHome>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image accessibilityIgnoresInvertColors source={require('../../assets/temple-night.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[styles.topRow, { paddingTop: insets.top + 8 }]}>
            <View style={styles.brand}>
              <Hexagon size={26} fill={color.monsoon} />
              <Text style={styles.brandName}>Awaaz</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.language}>
              <Text style={styles.languageText}>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.panel}>{form}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.rain, flex: 1 },
  content: { flexGrow: 1 },
  hero: { height: 300, overflow: 'hidden' },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandName: { color: color.ink, fontFamily: font.bold, fontSize: 22 },
  language: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  languageText: { color: color.ink, fontFamily: font.medium, fontSize: 16 },
  panel: { backgroundColor: color.rain, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexGrow: 1, marginTop: -24, padding: 22 },
  form: { gap: 14 },
  title: { fontSize: 26, lineHeight: 32 },
  intro: { gap: 2 },
  subheading: { fontSize: 17, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  field: { gap: 4 },
  label: { color: color.inkSoft, fontFamily: font.medium, fontSize: 14 },
  input: {
    backgroundColor: color.raised,
    borderColor: color.line,
    borderRadius: 14,
    borderWidth: 1,
    color: color.ink,
    fontFamily: font.regular,
    fontSize: 16,
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  switch: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  switchText: { color: color.monsoon, fontFamily: font.semibold, fontSize: 15 },
});
