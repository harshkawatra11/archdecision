// POST /api/pr-review — check a PR diff against the generated ADRs (stretch, PRD §7.4, §12.4).

import { readBody, sendError, type Req, type Res } from './_lib/http.js';
import { GitHubError, getPullRequestFiles, parsePrUrl } from './_lib/github.js';
import { prUserPrompt, PR_SYSTEM } from './_lib/prompts.js';
import { extractJson, generate, humanizeLLMError, isLLMConfigured, LLMConfigError } from './_lib/llm.js';
import type { ADR, PRReview } from './_lib/schema.js';

interface Body {
  prUrl?: string;
  adrs?: ADR[];
  pat?: string;
}

const DIFF_CHAR_CAP = 60_000;

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return sendError(res, { status: 405, message: 'Method not allowed.' });

  const body = await readBody<Body>(req);
  const parsed = parsePrUrl(body.prUrl || '');
  if (!parsed) {
    return sendError(res, {
      status: 400,
      message: "That doesn't look like a pull request URL.",
      hint: 'Use a form like https://github.com/owner/repo/pull/123.',
    });
  }
  if (!body.adrs?.length) {
    return sendError(res, { status: 409, message: 'Analyze the repository first so there are ADRs to check against.' });
  }
  if (!isLLMConfigured()) {
    return sendError(res, { status: 503, message: 'The analysis engine is not configured on the server.' });
  }

  try {
    const files = await getPullRequestFiles(parsed.ref, parsed.number, body.pat);
    let diff = files
      .map((f) => `--- ${f.filename} (${f.status}) ---\n${f.patch || '(no textual diff)'}`)
      .join('\n\n');
    const truncated = diff.length > DIFF_CHAR_CAP;
    if (truncated) diff = diff.slice(0, DIFF_CHAR_CAP);

    const raw = await generate({ system: PR_SYSTEM, user: prUserPrompt(diff, body.adrs), json: true, temperature: 0.1 });
    const obj = extractJson(raw) as { findings?: PRReview['findings'] };
    const review: PRReview = {
      prUrl: body.prUrl!,
      findings: Array.isArray(obj.findings) ? obj.findings : [],
      truncated,
    };
    res.status(200).json(review);
  } catch (e) {
    console.error('[pr-review]', e);
    if (e instanceof GitHubError) return sendError(res, { status: e.status || 500, message: e.message });
    if (e instanceof LLMConfigError) return sendError(res, { status: 503, message: e.message });
    return sendError(res, { status: 500, message: humanizeLLMError(e) });
  }
}
