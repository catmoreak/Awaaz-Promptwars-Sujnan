import type { TranscribeInput } from '@awaaz/shared';

export type VoiceClip = Omit<TranscribeInput, 'language'>;

export interface VoiceRecorder {
  recording: boolean;
  /** Resolves to false when microphone access is denied. */
  start: () => Promise<boolean>;
  stop: () => Promise<VoiceClip | null>;
}

/** Just under Google's one-minute limit for a single recognition request. */
export const MAX_RECORDING_MS = 55_000;
