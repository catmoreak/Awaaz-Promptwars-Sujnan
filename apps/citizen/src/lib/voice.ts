import type { TranscribeInput } from '@awaaz/shared';

export type VoiceClip = TranscribeInput;

export interface VoiceRecorder {
  recording: boolean;
  /** Resolves to false when microphone access is denied. */
  start: () => Promise<boolean>;
  stop: () => Promise<VoiceClip | null>;
}

export const MAX_RECORDING_MS = 60_000;
