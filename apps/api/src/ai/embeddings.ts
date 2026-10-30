import { env } from '../config';

export const LOCAL_EMBEDDING_MODEL = 'local-hash-v1';
const LOCAL_DIMENSIONS = 512;

interface Embedding {
  vector: number[];
  model: string;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalize(vector: number[]): number[] {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length === 0 ? vector : vector.map((value) => value / length);
}

/** Word and word-pair hashing. It matches shared wording only, so it cannot match across languages. */
export function hashEmbedding(text: string): number[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const vector = new Array<number>(LOCAL_DIMENSIONS).fill(0);
  const add = (token: string, weight: number) => {
    const hash = fnv1a(token);
    const index = hash % LOCAL_DIMENSIONS;
    vector[index] = (vector[index] ?? 0) + (hash & 1 ? weight : -weight);
  };

  words.forEach((word, index) => {
    add(word, 1);
    const next = words[index + 1];
    if (next) add(`${word} ${next}`, 0.5);
  });
  return normalize(vector);
}

export async function embedText(text: string): Promise<Embedding> {
  if (env.MISTRAL_API_KEY) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ model: env.MISTRAL_EMBEDDING_MODEL, input: [text] }),
      });
      if (!response.ok) throw new Error(`Mistral embeddings returned ${response.status}`);
      const body = (await response.json()) as { data?: { embedding?: number[] }[] };
      const vector = body.data?.[0]?.embedding;
      if (!vector?.length) throw new Error('Mistral embeddings returned no vector');
      return { vector: normalize(vector), model: env.MISTRAL_EMBEDDING_MODEL };
    } catch {
      // The local embedding keeps duplicate detection running, and the stored model name records the downgrade.
    }
  }
  return { vector: hashEmbedding(text), model: LOCAL_EMBEDDING_MODEL };
}

export function cosine(a: number[], b: number[]): number {
  let total = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) total += (a[i] ?? 0) * (b[i] ?? 0);
  return total;
}
