// Thin, swappable LLM interface (PRD §16 portability). Default provider: GitHub Models
// (OpenAI-compatible). The token lives ONLY here (server-side env var) and never reaches
// the client. Swap providers by changing LLM_BASE_URL / LLM_MODEL / token env vars —
// any OpenAI-compatible endpoint (GitHub Models, Groq, OpenRouter, Cerebras) works.

// Read at call time (not module load) so .env is already loaded when these are evaluated.
function getBaseUrl() {
  return (process.env.LLM_BASE_URL || 'https://models.github.ai/inference').replace(/\/$/, '');
}
function getModel() {
  return process.env.LLM_MODEL || process.env.GEMINI_MODEL || 'openai/gpt-4o-mini';
}

export class LLMConfigError extends Error {}

function getToken(): string {
  const token = process.env.LLM_API_KEY || process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new LLMConfigError(
      'No model API key configured on the server. Set LLM_API_KEY in your environment (.env locally, project settings on Vercel).',
    );
  }
  return token;
}

export function isLLMConfigured(): boolean {
  return !!(process.env.LLM_API_KEY || process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN);
}

export interface GenerateOptions {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function buildBody({ system, user, json, temperature }: GenerateOptions, stream: boolean) {
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  // Note: we deliberately do NOT set response_format=json_object. That mode forces a
  // JSON *object*, but the ADR/drift prompts expect a JSON *array*. The prompts already
  // instruct "return JSON only" and extractJson tolerates fences/prose, which is both
  // robust and portable across OpenAI-compatible providers. `json` only lowers temperature.
  return {
    model: getModel(),
    messages,
    temperature: temperature ?? (json ? 0.1 : 0.4),
    stream,
  };
}

/** Turn a non-2xx response into a descriptive Error so humanizeLLMError can map it. */
async function toError(res: Response): Promise<Error> {
  let detail = '';
  try {
    detail = await res.text();
  } catch {
    /* ignore */
  }
  return new Error(`${res.status} ${res.statusText} ${detail}`.trim());
}

/** One-shot generation. Returns the full text. */
export async function generate(opts: GenerateOptions): Promise<string> {
  const token = getToken();
  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(opts, false)),
  });
  if (!res.ok) {
    const err = await toError(res);
    console.error('[llm] generate error:', err.message.slice(0, 300));
    throw err;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Streaming generation. Yields text deltas. */
export async function* generateStream(opts: GenerateOptions): AsyncGenerator<string> {
  const token = getToken();
  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(opts, true)),
  });
  if (!res.ok) throw await toError(res);
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // OpenAI-compatible SSE: lines of "data: {json}" separated by blank lines.
    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const t = json.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch {
        /* skip keep-alive / partial frames */
      }
    }
  }
}

/**
 * Turn an opaque provider error into a friendly, actionable message.
 * Never leaks a stack trace; distinguishes the common free-tier failure modes.
 */
export function humanizeLLMError(e: unknown): string {
  if (e instanceof LLMConfigError) return e.message;
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const s = raw.toLowerCase();
  if (s.includes('401') || s.includes('403') || s.includes('unauthorized') || s.includes('forbidden')) {
    return 'The model API key was rejected. Check LLM_API_KEY (and LLM_BASE_URL) are valid and set in the deployment.';
  }
  if (s.includes('413') || s.includes('too large') || s.includes('payload') || s.includes('tokens per minute') || s.includes('reduce your message')) {
    return 'This repository is too large for the free model tier. Try a smaller repo, or add a GitHub token to reduce the fetched file count.';
  }
  if (s.includes('429') || s.includes('quota') || s.includes('resource_exhausted') || s.includes('rate limit')) {
    return 'The model is rate-limited on the free tier right now. Wait a few seconds and try again.';
  }
  if (s.includes('503') || s.includes('overloaded') || s.includes('unavailable')) {
    return 'The model is temporarily overloaded. Please try again in a moment.';
  }
  if (s.includes('safety') || s.includes('blocked') || s.includes('content_filter')) {
    return 'The model declined to answer for this content. Try a different repository or question.';
  }
  if (s.includes('timeout') || s.includes('deadline')) {
    return 'That request took too long. Try again — large repos sometimes need a second attempt.';
  }
  return 'Could not reach the analysis engine right now. Please try again.';
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
