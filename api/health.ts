import type { Req, Res } from './_lib/http.js';
import { isLLMConfigured } from './_lib/llm.js';

export default function handler(_req: Req, res: Res) {
  res.status(200).json({ ok: true, time: new Date().toISOString(), llm: isLLMConfigured() });
}
