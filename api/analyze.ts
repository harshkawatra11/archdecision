// POST /api/analyze — full ingestion + ADR generation, streamed as SSE pipeline stages.
// PRD §7.1, §12.1.

import { openSSE, readBody, sendError, sse, type Req, type Res } from './_lib/http.js';
import { GitHubError, parseRepoUrl } from './_lib/github.js';
import { buildRepoProfile, hasSufficientSignal } from './_lib/ingest.js';
import { toLite } from './_lib/profile.js';
import { adrUserPrompt, ADR_SYSTEM } from './_lib/prompts.js';
import { extractJson, generate, humanizeLLMError, isLLMConfigured, LLMConfigError } from './_lib/llm.js';
import { validateAdrArray } from './_lib/schema.js';
import { cacheProfile } from './_lib/cache.js';
import type { ADR, RepoProfile } from './_lib/schema.js';

interface Body {
  repoUrl?: string;
  pat?: string;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return sendError(res, { status: 405, message: 'Method not allowed.' });
  }

  const { repoUrl, pat } = await readBody<Body>(req);
  const ref = parseRepoUrl(repoUrl || '');
  if (!ref) {
    return sendError(res, {
      status: 400,
      message: "That doesn't look like a GitHub repo URL.",
      hint: 'Try a form like https://github.com/owner/repo or owner/repo.',
    });
  }
  if (!isLLMConfigured()) {
    return sendError(res, {
      status: 503,
      message: 'The analysis engine is not configured on the server.',
      hint: 'Set LLM_API_KEY in the environment and redeploy.',
    });
  }

  openSSE(res);

  try {
    const profile = await buildRepoProfile(ref, pat, (stage, detail) => {
      sse(res, 'stage', { stage, detail });
    });

    if (!hasSufficientSignal(profile)) {
      const adrs = [insufficientSignalAdr(profile)];
      cacheProfile(profile, adrs);
      sse(res, 'stage', { stage: 'done' });
      sse(res, 'result', { profileLite: toLite(profile), adrs, sha: profile.sha });
      return endStream(res);
    }

    sse(res, 'stage', { stage: 'inferring', detail: 'Inferring architectural decisions' });
    const adrs = await generateAdrs(profile);
    cacheProfile(profile, adrs);

    sse(res, 'stage', { stage: 'done' });
    sse(res, 'result', { profileLite: toLite(profile), adrs, sha: profile.sha });
    endStream(res);
  } catch (e) {
    handleStreamError(res, e);
  }
}

async function generateAdrs(profile: RepoProfile): Promise<ADR[]> {
  const userPrompt = adrUserPrompt(profile);
  let raw = await generate({ system: ADR_SYSTEM, user: userPrompt, json: true, temperature: 0.1 });
  let parsed = validateAdrArray(safeExtract(raw));

  if (!parsed.ok) {
    // Single repair retry with the validation errors appended (PRD §14.2, §14.7).
    const repair = `${userPrompt}\n\nYour previous output failed validation:\n${parsed.errors.join('\n')}\nReturn a corrected JSON array only.`;
    raw = await generate({ system: ADR_SYSTEM, user: repair, json: true, temperature: 0.1 });
    parsed = validateAdrArray(safeExtract(raw));
  }

  if (!parsed.ok) {
    throw new ModelFormatError('The model returned an unexpected format. Please try analyzing again.');
  }
  // Defensive guardrail against a pathological response; not a product-level cap.
  const MAX_ADRS = 16;
  // Re-number sequentially for a clean UI.
  return parsed.adrs.slice(0, MAX_ADRS).map((a, i) => ({ ...a, id: `ADR-${String(i + 1).padStart(3, '0')}` }));
}

function safeExtract(raw: string): unknown {
  try {
    return extractJson(raw);
  } catch {
    return null;
  }
}

function insufficientSignalAdr(profile: RepoProfile): ADR {
  return {
    id: 'ADR-001',
    title: 'Insufficient signal to infer architectural decisions',
    status: 'inferred',
    confidence: 'low',
    category: 'structure',
    context: `The repository ${profile.owner}/${profile.repo} does not yet contain enough recognizable signal — no dependency manifests, minimal source, or a near-empty tree — to confidently infer architectural decisions.`,
    decision: 'No decisions could be reliably inferred from the current contents.',
    rationale:
      'ArchDecision grounds every claim in concrete evidence (manifests, configs, source patterns). With too little of that present, inferring decisions would be guessing, which this tool will not do.',
    alternatives: [],
    consequences: [
      'Add a dependency manifest, source files, or a README and re-run to get grounded decision records.',
    ],
    evidence: [
      { type: 'structure', ref: `${profile.stats.totalFiles} files total`, note: 'Too little code to analyze.' },
    ],
  };
}

class ModelFormatError extends Error {}

function handleStreamError(res: Res, e: unknown): void {
  let message = 'Something went wrong while analyzing this repository.';
  let hint: string | undefined;
  if (e instanceof GitHubError) {
    message = e.message;
    if (e.code === 'rate_limit' || e.code === 'not_found') {
      hint = 'Add a GitHub personal access token (top of the form) and try again.';
    }
  } else if (e instanceof LLMConfigError) {
    message = e.message;
  } else if (e instanceof ModelFormatError) {
    message = e.message;
  } else {
    // Any remaining error is most likely from the LLM provider (bad key, rate
    // limit, overload). Surface a readable, actionable message instead of the
    // generic fallback.
    message = humanizeLLMError(e);
  }
  // If headers already sent (SSE open), emit an error event; else send JSON.
  if (res.headersSent || (res as unknown as { writableEnded?: boolean }).writableEnded === false) {
    try {
      sse(res, 'error', { message, hint: hint ?? null });
      res.end();
      return;
    } catch {
      /* fallthrough */
    }
  }
  sendError(res, { status: 500, message, hint });
}

function endStream(res: Res): void {
  res.write('event: end\ndata: {}\n\n');
  res.end();
}
