import { AudioModule, IOSOutputFormat, RecordingPresets, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { VoiceClip, VoiceRecorder } from './voice';

/** AMR-WB is built for speech, and Google Speech-to-Text accepts it directly at 16 kHz mono. */
const SPEECH_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: Platform.OS === 'ios' ? '.wav' : '.amr',
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 23_850,
  android: { outputFormat: 'amrwb', audioEncoder: 'amr_wb' },
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    outputFormat: IOSOutputFormat.LINEARPCM,
  },
};

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(SPEECH_RECORDING);
  const [recording, setRecording] = useState(false);

  const start = useCallback(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) return false;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceClip | null> => {
    setRecording(false);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!recorder.uri) return null;
    return { base64: await new File(recorder.uri).base64(), mime: Platform.OS === 'ios' ? 'audio/wav' : 'audio/amr-wb' };
  }, [recorder]);

  return { recording, start, stop };
}
