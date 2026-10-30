import type { z } from 'zod';
import { env } from '../config';

export interface ImagePart {
  base64: string;
  mime: string;
}

interface Provider {
  name: 'mistral' | 'openrouter';
  url: string;
  key: string;
  model: string;
}

export interface LlmResult<T> {
  data: T;
  model: string;
}

function providers(): Provider[] {
  const all: Provider[] = [
    {
      name: 'mistral',
      url: 'https://api.mistral.ai/v1/chat/completions',
      key: env.MISTRAL_API_KEY,
      model: env.MISTRAL_CHAT_MODEL,
    },
    {
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_CHAT_MODEL,
    },
  ];
  return all.filter((provider) => provider.key);
}

function userContent(provider: Provider, text: string, image?: ImagePart) {
  if (!image) return text;
  const url = `data:${image.mime};base64,${image.base64}`;
  return [
    { type: 'text', text },
    { type: 'image_url', image_url: provider.name === 'mistral' ? url : { url } },
  ];
}

function parseJsonReply(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced?.[1] ?? content);
}

async function callProvider<T>(
  provider: Provider,
  options: { system: string; user: string; image?: ImagePart; schema: z.ZodType<T>; timeoutMs: number },
): Promise<LlmResult<T>> {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(options.timeoutMs),
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: userContent(provider, options.user, options.image) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider.name} returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const body = (await response.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider.name} returned an empty reply`);

  return { data: options.schema.parse(parseJsonReply(content)), model: `${provider.name}:${body.model ?? provider.model}` };
}

/** Tries each configured provider in order, and validates every reply against the schema. */
export async function generateJson<T>(options: {
  system: string;
  user: string;
  image?: ImagePart;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}): Promise<LlmResult<T>> {
  const configured = providers();
  if (configured.length === 0) throw new Error('No AI provider is configured');

  const failures: string[] = [];
  for (const provider of configured) {
    try {
      return await callProvider(provider, { ...options, timeoutMs: options.timeoutMs ?? 20_000 });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(failures.join(' | '));
}
