import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';
import type { VoiceClip, VoiceRecorder } from './voice';

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
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
    return { base64: await new File(recorder.uri).base64(), mime: 'audio/mp4' };
  }, [recorder]);

  return { recording, start, stop };
}
