import type { TranscribeInput, TranscribeResponse } from '@awaaz/shared';
import { env } from '../config';
import { unavailable } from '../errors';

const LANGUAGE_CODES: Record<TranscribeInput['language'], string> = { kn: 'kn-IN', en: 'en-IN' };

const AUDIO_SETTINGS: Record<TranscribeInput['mime'], { encoding: string; sampleRateHertz: number }> = {
  'audio/wav': { encoding: 'LINEAR16', sampleRateHertz: 16_000 },
  'audio/amr-wb': { encoding: 'AMR_WB', sampleRateHertz: 16_000 },
};

// Boosts place names the speech model would otherwise guess at.
const LOCAL_PHRASES = ['Moodbidri', 'Moodabidri', 'Mudbidri', 'Vidyagiri', 'Basadi', 'ಮೂಡುಬಿದಿರೆ'];
const PHRASE_BOOST = 15;

const MODEL = 'google-speech-to-text-v1';

interface RecognizeResponse {
  results?: { alternatives?: { transcript?: string }[] }[];
}

/** The citizen picks the language, because Google documents automatic detection for voice commands only. */
export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeResponse> {
  if (!env.GOOGLE_SPEECH_API_KEY) {
    throw unavailable('voice_unavailable', 'Voice input is not configured. Please type your report.');
  }

  let response: Response;
  try {
    response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_SPEECH_API_KEY },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        config: {
          ...AUDIO_SETTINGS[input.mime],
          languageCode: LANGUAGE_CODES[input.language],
          enableAutomaticPunctuation: true,
          speechContexts: [{ phrases: LOCAL_PHRASES, boost: PHRASE_BOOST }],
        },
        audio: { content: input.base64 },
      }),
    });
  } catch {
    throw unavailable('voice_failed', 'Voice input could not be reached. Please try again or type your report.');
  }

  if (!response.ok) {
    console.error(`Google Speech-to-Text returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    throw unavailable('voice_failed', 'Voice input failed. Please try again or type your report.');
  }

  const body = (await response.json()) as RecognizeResponse;
  const transcript = (body.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript?.trim() ?? '')
    .filter(Boolean)
    .join(' ');

  if (!transcript) {
    throw unavailable('voice_empty', 'No speech was heard. Please try again or type your report.');
  }
  return { transcript, language: input.language, model: MODEL };
}
