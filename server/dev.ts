// Local dev API server. Mounts the Vercel function handlers under /api on :3001.
// Vite proxies /api here (see vite.config.ts). In production these run as serverless
// functions on Vercel and this file is not used.

import { existsSync } from 'node:fs';
import express from 'express';
import type { Request, Response } from 'express';

// Load .env (Node 20.12+/24 built-in) without an extra dependency.
if (existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* ignore — env may be provided by the shell */
  }
}

import analyze from '../api/analyze.js';
import ask from '../api/ask.js';
import onboarding from '../api/onboarding.js';
import prReview from '../api/pr-review.js';
import drift from '../api/drift.js';
import health from '../api/health.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

type Handler = (req: unknown, res: unknown) => unknown;
const mount = (h: Handler) => (req: Request, res: Response) => {
  Promise.resolve(h(req, res)).catch((e) => {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error.' });
  });
};

app.get('/api/health', mount(health as Handler));
app.post('/api/analyze', mount(analyze as Handler));
app.post('/api/ask', mount(ask as Handler));
app.post('/api/onboarding', mount(onboarding as Handler));
app.post('/api/pr-review', mount(prReview as Handler));
app.post('/api/drift', mount(drift as Handler));

const port = Number(process.env.API_PORT || 3001);
app.listen(port, () => {
  const configured = !!(process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.GITHUB_MODELS_TOKEN);
  console.log(`\n  ArchDecision API → http://localhost:${port}`);
  console.log(`  LLM_API_KEY ${configured ? 'detected ✓' : 'NOT set ✗ (analysis will return a friendly 503)'}\n`);
});
