// POST /api/drift — Tech Debt Drift Map: where the code has diverged from the
// architecture its own ADRs describe (stretch, PRD §7.5).

import { readBody, sendError, type Req, type Res } from './_lib/http.js';
import { GitHubError, parseRepoUrl } from './_lib/github.js';
import { buildRepoProfile } from './_lib/ingest.js';
import { driftUserPrompt, DRIFT_SYSTEM } from './_lib/prompts.js';
import { extractJson, generate, humanizeLLMError, isLLMConfigured, LLMConfigError } from './_lib/llm.js';
import { cacheProfile, getCached } from './_lib/cache.js';
import type { ADR, DriftMap, RepoProfile } from './_lib/schema.js';

interface Body {
  repoUrl?: string;
  sha?: string;
  adrs?: ADR[];
  pat?: string;
}

const ALLOWED = new Set(['aligned', 'minor', 'major']);

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return sendError(res, { status: 405, message: 'Method not allowed.' });

  const body = await readBody<Body>(req);
  const ref = parseRepoUrl(body.repoUrl || '');
  if (!ref) {
    return sendError(res, { status: 400, message: "That doesn't look like a GitHub repo URL." });
  }
  if (!body.adrs?.length) {
    return sendError(res, { status: 409, message: 'Analyze the repository first so there are decisions to measure drift against.' });
  }
  if (!isLLMConfigured()) {
    return sendError(res, {
      status: 503,
      message: 'The analysis engine is not configured on the server.',
      hint: 'Set GEMINI_API_KEY and redeploy.',
    });
  }

  // Reuse the cached profile; rebuild on cold function (acceptable per PRD §12.6).
  let profile: RepoProfile | undefined = getCached(ref.owner, ref.repo, body.sha || '')?.profile;
  try {
    if (!profile) {
      profile = await buildRepoProfile(ref, body.pat);
      cacheProfile(profile);
    }

    const raw = await generate({
      system: DRIFT_SYSTEM,
      user: driftUserPrompt(profile, body.adrs),
      json: true,
      temperature: 0.2,
    });
    const obj = extractJson(raw) as Partial<DriftMap>;
    const findings = Array.isArray(obj.findings)
      ? obj.findings
          .filter((f) => f && typeof f.title === 'string')
          .map((f) => ({
            title: String(f.title),
            adrId: typeof f.adrId === 'string' ? f.adrId : '',
            severity: ALLOWED.has(String(f.severity)) ? (f.severity as DriftMap['findings'][number]['severity']) : 'minor',
            observation: typeof f.observation === 'string' ? f.observation : '',
            expectation: typeof f.expectation === 'string' ? f.expectation : '',
            evidence: Array.isArray(f.evidence) ? f.evidence.map(String).filter(Boolean) : [],
            recommendation: typeof f.recommendation === 'string' ? f.recommendation : '',
          }))
      : [];

    const map: DriftMap = {
      summary: typeof obj.summary === 'string' ? obj.summary : '',
      findings,
    };
    res.status(200).json(map);
  } catch (e) {
    console.error('[drift]', e);
    if (e instanceof GitHubError) return sendError(res, { status: e.status || 500, message: e.message });
    if (e instanceof LLMConfigError) return sendError(res, { status: 503, message: e.message });
    return sendError(res, { status: 500, message: humanizeLLMError(e) });
  }
}
