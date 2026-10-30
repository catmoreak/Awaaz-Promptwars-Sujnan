import type { TranscribeInput } from '@awaaz/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clip: TranscribeInput = { base64: 'UklGRiQAAABXQVZFZm10IBAAAAA=', mime: 'audio/wav', language: 'kn' };

async function loadTranscribe(key = 'test-key') {
  vi.resetModules();
  vi.stubEnv('GOOGLE_SPEECH_API_KEY', key);
  return (await import('./transcribe')).transcribeAudio;
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const spoken = (...lines: string[]) =>
  new Response(JSON.stringify({ results: lines.map((transcript) => ({ alternatives: [{ transcript }] })) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('transcribeAudio', () => {
  it('sends the chosen language and the right encoding', async () => {
    const fetchMock = mockFetch(spoken('ರಸ್ತೆ ಹಾಳಾಗಿದೆ'));
    const transcribe = await loadTranscribe();
    await transcribe(clip);

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body as string);
    expect(body.config).toMatchObject({ languageCode: 'kn-IN', encoding: 'LINEAR16', sampleRateHertz: 16000 });
    expect(body.audio.content).toBe(clip.base64);
  });

  it('uses the Android recording format', async () => {
    const fetchMock = mockFetch(spoken('the road is broken'));
    const transcribe = await loadTranscribe();
    await transcribe({ ...clip, mime: 'audio/amr-wb', language: 'en' });

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body as string);
    expect(body.config).toMatchObject({ languageCode: 'en-IN', encoding: 'AMR_WB', sampleRateHertz: 16000 });
  });

  it('keeps the key out of the URL, so it cannot reach request logs', async () => {
    const fetchMock = mockFetch(spoken('hello there'));
    const transcribe = await loadTranscribe();
    await transcribe(clip);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('test-key');
    expect(fetchMock.mock.calls[0]?.[1].headers['X-Goog-Api-Key']).toBe('test-key');
  });

  it('joins every part of a longer recording', async () => {
    mockFetch(spoken('first part.', 'second part.'));
    const transcribe = await loadTranscribe();
    expect((await transcribe(clip)).transcript).toBe('first part. second part.');
  });

  it('says so when no speech was heard', async () => {
    mockFetch(new Response('{}'));
    const transcribe = await loadTranscribe();
    await expect(transcribe(clip)).rejects.toMatchObject({ code: 'voice_empty' });
  });

  it('asks the citizen to type when Google rejects the request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch(new Response('forbidden', { status: 403 }));
    const transcribe = await loadTranscribe();
    await expect(transcribe(clip)).rejects.toMatchObject({ code: 'voice_failed', statusCode: 503 });
  });

  it('fails clearly without calling Google when no key is set', async () => {
    const fetchMock = mockFetch(spoken('unused'));
    const transcribe = await loadTranscribe('');
    await expect(transcribe(clip)).rejects.toMatchObject({ code: 'voice_unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
