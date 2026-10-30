import type { TranscribeInput } from '@awaaz/shared';

export type VoiceClip = Omit<TranscribeInput, 'language'>;

export interface VoiceRecorder {
  recording: boolean;
  /** Resolves to false when microphone access is denied. */
  start: () => Promise<boolean>;
  stop: () => Promise<VoiceClip | null>;
}

/** A report rarely needs longer, and the speech model was tested on clips of up to 26 seconds. */
export const MAX_RECORDING_MS = 30_000;
