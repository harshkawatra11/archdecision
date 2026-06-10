// Browser API client. Parses Server-Sent Events from POST responses via fetch streaming
// (EventSource cannot POST), and exposes typed callbacks per endpoint.

import type { AnalyzeResult, DriftMap, PipelineStage, PRReview } from '../types';

export class ApiError extends Error {
  hint?: string | null;
  constructor(message: string, hint?: string | null) {
    super(message);
    this.hint = hint;
  }
}

interface SSEEvent {
  event: string;
  data: unknown;
}

/** Stream and yield parsed SSE events from a POST request. */
async function* postSSE(url: string, body: unknown): AsyncGenerator<SSEEvent> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Request failed (${res.status}).`, err.hint);
  }
  if (!res.body) throw new ApiError('No response stream from the server.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const ev = parseEvent(chunk);
      if (ev) yield ev;
    }
  }
}

function parseEvent(chunk: string): SSEEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return { event, data: dataLines.join('\n') };
  }
}

export interface AnalyzeHandlers {
  onStage: (stage: PipelineStage, detail?: string) => void;
  onResult: (result: AnalyzeResult) => void;
  onError: (message: string, hint?: string | null) => void;
}

export async function analyze(repoUrl: string, pat: string | undefined, h: AnalyzeHandlers): Promise<void> {
  try {
    for await (const ev of postSSE('/api/analyze', { repoUrl, pat: pat || undefined })) {
      if (ev.event === 'stage') {
        const d = ev.data as { stage: PipelineStage; detail?: string };
        h.onStage(d.stage, d.detail);
      } else if (ev.event === 'result') {
        h.onResult(ev.data as AnalyzeResult);
      } else if (ev.event === 'error') {
        const d = ev.data as { message: string; hint?: string | null };
        h.onError(d.message, d.hint);
      }
    }
  } catch (e) {
    if (e instanceof ApiError) h.onError(e.message, e.hint);
    else h.onError('Something went wrong. Please try again.');
  }
}

export interface AskHandlers {
  onToken: (text: string) => void;
  onSources: (sources: { path: string; reason: string }[], considered: string[]) => void;
  onError: (message: string) => void;
}

export async function ask(
  body: { repoUrl: string; sha: string; question: string; history: { role: 'user' | 'assistant'; content: string }[]; pat?: string },
  h: AskHandlers,
): Promise<void> {
  try {
    for await (const ev of postSSE('/api/ask', body)) {
      if (ev.event === 'token') h.onToken((ev.data as { text: string }).text);
      else if (ev.event === 'sources') {
        const d = ev.data as { sources: { path: string; reason: string }[]; considered: string[] };
        h.onSources(d.sources, d.considered);
      } else if (ev.event === 'error') h.onError((ev.data as { message: string }).message);
    }
  } catch (e) {
    h.onError(e instanceof ApiError ? e.message : 'Could not answer that. Please try again.');
  }
}

export async function onboarding(
  body: { repoUrl: string; sha: string; adrs: unknown[]; pat?: string },
  h: { onToken: (text: string) => void; onError: (message: string) => void },
): Promise<void> {
  try {
    for await (const ev of postSSE('/api/onboarding', body)) {
      if (ev.event === 'token') h.onToken((ev.data as { text: string }).text);
      else if (ev.event === 'error') h.onError((ev.data as { message: string }).message);
    }
  } catch (e) {
    h.onError(e instanceof ApiError ? e.message : 'Could not generate the doc. Please try again.');
  }
}

export async function prReview(body: { prUrl: string; adrs: unknown[]; pat?: string }): Promise<PRReview> {
  const res = await fetch('/api/pr-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'PR review failed.', data.hint);
  return data as PRReview;
}

export async function drift(body: {
  repoUrl: string;
  sha: string;
  adrs: unknown[];
  pat?: string;
}): Promise<DriftMap> {
  const res = await fetch('/api/drift', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Drift analysis failed.', data.hint);
  return data as DriftMap;
}
