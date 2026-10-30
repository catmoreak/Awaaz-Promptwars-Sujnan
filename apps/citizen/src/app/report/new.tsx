import { CATEGORIES, CATEGORY_LABELS, LIMITS, type Category, type CreateReportInput } from '@awaaz/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Camera, ImagePlus, LocateFixed, Mic, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPicker } from '@/components/MapPicker';
import type { LatLng } from '@/components/CoordinateFields';
import { Button, ErrorText, Heading, Muted } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useLanguage, type Language } from '@/lib/i18n';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { MAX_RECORDING_MS } from '@/lib/voice';
import { color, font } from '@/theme';

const IMAGE_MAX_WIDTH = 1280;

const VOICE_OPTIONS: { id: Language; label: string }[] = [
  { id: 'kn', label: 'ಕನ್ನಡ' },
  { id: 'en', label: 'English' },
];

async function preparePhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: IMAGE_MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  return { uri: saved.uri, base64: saved.base64 ?? '' };
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Heading>{title}</Heading>
      {hint && <Muted>{hint}</Muted>}
      {children}
    </View>
  );
}

export default function NewReport() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const voice = useVoiceRecorder();

  const [clientRequestId] = useState(randomUUID);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [viaVoice, setViaVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<Language>(language);
  const [formError, setFormError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transcribe = useMutation({
    mutationFn: api.transcribe,
    onSuccess: (result) => {
      setText((current) => (current ? `${current} ${result.transcript}` : result.transcript));
      setViaVoice(true);
    },
    onError: (error) => setVoiceError(error instanceof ApiError ? error.message : t.voiceOff),
  });

  const stopRecording = async () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    const clip = await voice.stop();
    if (clip) transcribe.mutate({ ...clip, language: voiceLanguage });
  };

  const stopRef = useRef(stopRecording);
  stopRef.current = stopRecording;
  useEffect(
    () => () => {
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
    },
    [],
  );

  const startRecording = async () => {
    setVoiceError(null);
    if (!(await voice.start())) {
      setVoiceError(t.micDenied);
      return;
    }
    recordingTimer.current = setTimeout(() => void stopRef.current(), MAX_RECORDING_MS);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (!result.canceled && asset) setPhoto(await preparePhoto(asset.uri));
  };

  const useMyLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(t.locationDenied);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      setLocationError(t.locationDenied);
    } finally {
      setLocating(false);
    }
  };

  const submit = useMutation({
    mutationFn: (input: CreateReportInput) => api.createReport(input),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      router.replace(`/report/${report.id}`);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : t.retry),
  });

  const send = () => {
    setFormError(null);
    if (text.trim().length < LIMITS.textMin) return setFormError(t.textRequired);
    if (!point) return setFormError(t.locationRequired);

    submit.mutate({
      clientRequestId,
      text: text.trim(),
      category: category ?? 'OTHER',
      lat: point.lat,
      lng: point.lng,
      address: address.trim() || undefined,
      viaVoice,
      image: photo ? { base64: photo.base64, mime: 'image/jpeg' } : undefined,
    });
  };

  const voiceAvailable = config.data?.voiceEnabled;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Section title={t.describe} hint={t.describeHint}>
          <TextInput
            accessibilityLabel={t.describe}
            maxLength={LIMITS.textMax}
            multiline
            onChangeText={setText}
            style={styles.textArea}
            textAlignVertical="top"
            value={text}
          />
          {voiceAvailable === false && <Muted>{t.voiceOff}</Muted>}
          {voiceAvailable && (
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t.voiceLanguage}>
              {VOICE_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: voiceLanguage === option.id }}
                  disabled={voice.recording}
                  onPress={() => setVoiceLanguage(option.id)}
                  style={[styles.chip, styles.flex, voiceLanguage === option.id && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, styles.centered, voiceLanguage === option.id && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {voiceAvailable && (
            <Button
              kind="quiet"
              busy={transcribe.isPending}
              label={transcribe.isPending ? t.transcribing : voice.recording ? t.stop : t.speak}
              icon={voice.recording ? <Square color={color.critical} size={18} /> : <Mic color={color.monsoon} size={20} />}
              onPress={() => void (voice.recording ? stopRecording() : startRecording())}
            />
          )}
          {viaVoice && <Muted>{t.voiceReview}</Muted>}
          {voiceError && <ErrorText>{voiceError}</ErrorText>}
        </Section>

        <Section title={t.photo} hint={t.photoOptional}>
          {photo ? (
            <>
              <Image accessibilityIgnoresInvertColors source={{ uri: photo.uri }} style={styles.photo} />
              <Button kind="quiet" label={t.removePhoto} onPress={() => setPhoto(null)} />
            </>
          ) : (
            <View style={styles.row}>
              {Platform.OS !== 'web' && (
                <Button kind="quiet" label={t.takePhoto} icon={<Camera color={color.monsoon} size={20} />} onPress={() => void pickPhoto('camera')} style={styles.flex} />
              )}
              <Button kind="quiet" label={t.choosePhoto} icon={<ImagePlus color={color.monsoon} size={20} />} onPress={() => void pickPhoto('library')} style={styles.flex} />
            </View>
          )}
        </Section>

        <Section title={t.category}>
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected: category === item }}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item && styles.chipSelected]}
              >
                <Text style={[styles.chipText, category === item && styles.chipTextSelected]}>{CATEGORY_LABELS[item][language]}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={t.location} hint={t.locationHint}>
          <MapPicker value={point} onChange={setPoint} />
          <Button kind="quiet" busy={locating} label={locating ? t.locating : t.useMyLocation} icon={<LocateFixed color={color.monsoon} size={20} />} onPress={() => void useMyLocation()} />
          {locationError && <ErrorText>{locationError}</ErrorText>}
          {point && (
            <Muted>
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </Muted>
          )}
          <TextInput
            accessibilityLabel={t.landmark}
            maxLength={300}
            onChangeText={setAddress}
            placeholder={t.landmark}
            placeholderTextColor={color.inkFaint}
            style={styles.input}
            value={address}
          />
        </Section>

        {formError && <ErrorText>{formError}</ErrorText>}
        <Button label={submit.isPending ? t.submitting : t.submit} busy={submit.isPending} onPress={send} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignSelf: 'center', gap: 22, maxWidth: 620, padding: 16, width: '100%' },
  section: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  textArea: {
    backgroundColor: color.surface,
    borderColor: '#B3C4C1',
    borderRadius: 8,
    borderWidth: 1,
    color: color.ink,
    fontFamily: font.regular,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 120,
    padding: 12,
  },
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
  photo: { aspectRatio: 4 / 3, borderRadius: 8, width: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: color.surface,
    borderColor: color.line,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: color.monsoon, borderColor: color.monsoon },
  chipText: { color: color.ink, fontFamily: font.medium, fontSize: 15 },
  chipTextSelected: { color: '#FFFFFF' },
  centered: { textAlign: 'center' },
});
