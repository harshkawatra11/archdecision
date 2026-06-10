// POST /api/onboarding — generate the day-one onboarding doc, streamed (PRD §7.3, §12.3).

import { openSSE, readBody, sendError, sse, type Req, type Res } from './_lib/http.js';
import { GitHubError, parseRepoUrl } from './_lib/github.js';
import { buildRepoProfile } from './_lib/ingest.js';
import { onboardingUserPrompt, ONBOARDING_SYSTEM } from './_lib/prompts.js';
import { generateStream, humanizeLLMError, isLLMConfigured } from './_lib/llm.js';
import { getCached, cacheProfile } from './_lib/cache.js';
import type { ADR, RepoProfile } from './_lib/schema.js';

interface Body {
  repoUrl?: string;
  sha?: string;
  adrs?: ADR[];
  pat?: string;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return sendError(res, { status: 405, message: 'Method not allowed.' });

  const body = await readBody<Body>(req);
  const ref = parseRepoUrl(body.repoUrl || '');
  if (!ref) return sendError(res, { status: 400, message: 'A repo URL is required.' });
  if (!isLLMConfigured()) {
    return sendError(res, { status: 503, message: 'The analysis engine is not configured on the server.' });
  }

  const cached = getCached(ref.owner, ref.repo, body.sha || '');
  let profile: RepoProfile | undefined = cached?.profile;
  let adrs: ADR[] = body.adrs?.length ? body.adrs : cached?.adrs || [];

  try {
    if (!profile) {
      profile = await buildRepoProfile(ref, body.pat);
      cacheProfile(profile, adrs);
    }
  } catch (e) {
    if (e instanceof GitHubError) return sendError(res, { status: e.status || 500, message: e.message });
    return sendError(res, { status: 500, message: 'Could not build the onboarding doc right now.' });
  }

  openSSE(res);
  try {
    const user = onboardingUserPrompt(profile, adrs);
    for await (const delta of generateStream({ system: ONBOARDING_SYSTEM, user, temperature: 0.45 })) {
      sse(res, 'token', { text: delta });
    }
    res.write('event: end\ndata: {}\n\n');
    res.end();
  } catch (e) {
    console.error('[onboarding]', e);
    try {
      sse(res, 'error', { message: humanizeLLMError(e) });
      res.end();
    } catch {
      /* closed */
    }
  }
}
