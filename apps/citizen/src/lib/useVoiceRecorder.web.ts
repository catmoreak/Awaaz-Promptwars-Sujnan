import { useCallback, useRef, useState } from 'react';
import type { VoiceClip, VoiceRecorder } from './voice';

const SAMPLE_RATE = 16_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function encodeWav(samples: Float32Array): Uint8Array {
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(headerSize + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Uint8Array(buffer);
}

/** Browsers record WebM, which speech services do not all accept, so the clip becomes 16 kHz mono WAV. */
async function toWavClip(blob: Blob): Promise<VoiceClip> {
  const context = new AudioContext();
  const decoded = await context.decodeAudioData(await blob.arrayBuffer());
  await context.close();

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return { base64: toBase64(encodeWav(rendered.getChannelData(0))), mime: 'audio/wav' };
}

export function useVoiceRecorder(): VoiceRecorder {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    return true;
  }, []);

  const stop = useCallback(async (): Promise<VoiceClip | null> => {
    const recorder = recorderRef.current;
    setRecording(false);
    if (!recorder) return null;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    recorder.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    return toWavClip(new Blob(chunksRef.current, { type: recorder.mimeType }));
  }, []);

  return { recording, start, stop };
}
