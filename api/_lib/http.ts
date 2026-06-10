// Shared HTTP/SSE helpers. Works for both Vercel functions and the local Express dev server
// because both expose the Node res.setHeader/res.write/res.end + Express res.status/res.json APIs.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Req = VercelRequest;
export type Res = VercelResponse;

export interface FriendlyError {
  status: number;
  message: string;
  hint?: string;
}

/** Send a friendly JSON error. Never leaks stack traces (PRD §18). */
export function sendError(res: Res, err: FriendlyError): void {
  res.status(err.status).json({ error: err.message, hint: err.hint ?? null });
}

/** Read and JSON-parse the request body across Vercel (pre-parsed) and raw Node streams. */
export async function readBody<T>(req: Req): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  if (typeof req.body === 'string' && req.body.length) {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  // Raw stream fallback.
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

/** Begin a Server-Sent Events response. */
export function openSSE(res: Res): void {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  // Flush headers if available (Express/Node).
  (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
}

/** Emit one SSE event. */
export function sse(res: Res, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function endSSE(res: Res): void {
  res.write('event: end\ndata: {}\n\n');
  res.end();
}
