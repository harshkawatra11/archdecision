// Thin, swappable LLM interface (PRD §16 portability). Default provider: Gemini 2.5 Flash.
// The Gemini key lives ONLY here (server-side env var) and never reaches the client.

import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export class LLMConfigError extends Error {}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError(
      'GEMINI_API_KEY is not configured on the server. Add it to your environment (.env locally, project settings on Vercel).',
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function isLLMConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export interface GenerateOptions {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}

/** One-shot generation. Returns the full text. */
export async function generate({ system, user, json, temperature }: GenerateOptions): Promise<string> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: temperature ?? (json ? 0.1 : 0.4),
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });
  return res.text ?? '';
}

/** Streaming generation. Yields text deltas. */
export async function* generateStream({ system, user, temperature }: GenerateOptions): AsyncGenerator<string> {
  const ai = getClient();
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      temperature: temperature ?? 0.4,
    },
  });
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) yield t;
  }
}

/** Extract a JSON value from a model response, tolerating ```json fences and stray prose. */
export function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the first balanced array/object substring.
    const start = cleaned.search(/[[{]/);
    const lastArr = cleaned.lastIndexOf(']');
    const lastObj = cleaned.lastIndexOf('}');
    const end = Math.max(lastArr, lastObj);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    throw new Error('Model did not return valid JSON.');
  }
}
