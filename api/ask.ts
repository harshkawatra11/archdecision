// POST /api/ask — grounded Q&A over the analyzed repo, streamed (PRD §7.2, §12.2).

import { openSSE, readBody, sendError, sse, type Req, type Res } from './_lib/http.js';
import { GitHubError, getFileContent, parseRepoUrl } from './_lib/github.js';
import { buildRepoProfile } from './_lib/ingest.js';
import { profileForPrompt } from './_lib/profile.js';
import { askUserPrompt, ASK_SYSTEM, parseSourcesBlock } from './_lib/prompts.js';
import { generateStream, humanizeLLMError, isLLMConfigured, LLMConfigError } from './_lib/llm.js';
import { cacheProfile, getCached } from './_lib/cache.js';
import type { ADR, AskRequest, RepoProfile } from './_lib/schema.js';

const RETRIEVAL_PER_FILE_CAP = 12000;
const MAX_EXTRA_FETCH = 10;
const MAX_RETRIEVED = 18;

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return sendError(res, { status: 405, message: 'Method not allowed.' });

  const body = await readBody<AskRequest>(req);
  const ref = parseRepoUrl(body.repoUrl || '');
  if (!ref || !body.question?.trim()) {
    return sendError(res, { status: 400, message: 'A repo URL and a question are required.' });
  }
  if (!isLLMConfigured()) {
    return sendError(res, {
      status: 503,
      message: 'The analysis engine is not configured on the server.',
      hint: 'Set LLM_API_KEY and redeploy.',
    });
  }

  // Reuse the cached profile + ADRs; rebuild on cold function (acceptable per PRD §12.6).
  const cached = getCached(ref.owner, ref.repo, body.sha || '');
  let profile: RepoProfile | undefined = cached?.profile;
  // The generated ADRs are the most direct source for "why" questions; reuse them when present.
  const adrs: ADR[] = body.adrs?.length ? body.adrs : cached?.adrs || [];
  try {
    if (!profile) {
      profile = await buildRepoProfile(ref, body.pat);
      cacheProfile(profile, adrs);
    }
  } catch (e) {
    return jsonError(res, e);
  }

  openSSE(res);
  try {
    const retrieved = await retrieve(profile, body.question, body.pat);
    const user = askUserPrompt(profileForPrompt(profile), retrieved, body.history || [], body.question, adrs);

    let full = '';
    let inSources = false;
    for await (const delta of generateStream({ system: ASK_SYSTEM, user, temperature: 0.3 })) {
      full += delta;
      // Stop streaming raw text once the sources sentinel begins.
      if (!inSources && full.includes('<<<SOURCES>>>')) {
        inSources = true;
        const visible = full.slice(0, full.indexOf('<<<SOURCES>>>'));
        // (already streamed the visible portion below; nothing extra to emit here)
        void visible;
        continue;
      }
      if (!inSources) sse(res, 'token', { text: delta });
    }

    const { sources } = parseSourcesBlock(full);
    sse(res, 'sources', { sources, considered: retrieved.map((r) => r.path) });
    res.write('event: end\ndata: {}\n\n');
    res.end();
  } catch (e) {
    streamError(res, e);
  }
}

/** Heuristic retrieval v1: keyword + path matching over the profile's captured files. */
async function retrieve(
  profile: RepoProfile,
  question: string,
  pat?: string,
): Promise<{ path: string; content: string }[]> {
  const keywords = question
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const have = new Map<string, string>();
  // Always include README + signal files we already fetched (zero extra GitHub calls).
  if (profile.readme) have.set('README', profile.readme.slice(0, RETRIEVAL_PER_FILE_CAP));
  for (const f of profile.signalFiles) have.set(f.path, f.content.slice(0, RETRIEVAL_PER_FILE_CAP));

  // Path matches are the strongest signal; content matches let us find files whose name
  // does not advertise what they do (e.g. a question about "rate limiting").
  const pathScore = (path: string): number => {
    const p = path.toLowerCase();
    return keywords.reduce((s, k) => s + (p.includes(k) ? 2 : 0), 0);
  };
  const contentScore = (content: string): number => {
    const c = content.toLowerCase();
    // One point per matched keyword (presence, not frequency) so a single long file can't dominate.
    return keywords.reduce((s, k) => s + (c.includes(k) ? 1 : 0), 0);
  };

  // Find tree files that match keywords by PATH but aren't already captured, and fetch a few.
  const candidates = profile.fileTree
    .filter((n) => n.type === 'file' && !have.has(n.path) && pathScore(n.path) > 0)
    .sort((a, b) => pathScore(b.path) - pathScore(a.path) || a.size - b.size)
    .slice(0, MAX_EXTRA_FETCH);

  for (const c of candidates) {
    const content = await getFileContent(
      { owner: profile.owner, repo: profile.repo },
      c.path,
      profile.sha,
      pat,
    );
    if (content) have.set(c.path, content.slice(0, RETRIEVAL_PER_FILE_CAP));
  }

  // Rank every captured file by path + content relevance; cap the set fed to the model.
  // README keeps a small floor so it is available for general questions.
  return [...have.entries()]
    .map(([path, content]) => ({
      path,
      content,
      s: (path === 'README' ? 1 : pathScore(path)) + contentScore(content),
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RETRIEVED)
    .map(({ path, content }) => ({ path, content }));
}

const STOPWORDS = new Set([
  'the', 'and', 'why', 'how', 'does', 'this', 'that', 'what', 'where', 'when', 'who',
  'use', 'used', 'using', 'for', 'are', 'was', 'were', 'with', 'have', 'has', 'its',
  'our', 'you', 'your', 'they', 'them', 'from', 'into', 'here', 'there', 'about',
]);

function jsonError(res: Res, e: unknown) {
  if (e instanceof GitHubError) return sendError(res, { status: e.status || 500, message: e.message });
  if (e instanceof LLMConfigError) return sendError(res, { status: 503, message: e.message });
  return sendError(res, { status: 500, message: 'Could not answer that right now. Please try again.' });
}

function streamError(res: Res, e: unknown) {
  console.error('[ask]', e);
  const message = e instanceof GitHubError ? e.message : humanizeLLMError(e);
  try {
    sse(res, 'error', { message });
    res.end();
  } catch {
    /* already closed */
  }
}
