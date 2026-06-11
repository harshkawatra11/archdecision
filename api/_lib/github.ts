// GitHub REST API access — plain fetch, no SDK (PRD §13).
// PATs are used per-request only and never logged or cached.

import type { FileNode } from './schema.js';

const GH = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  code: 'not_found' | 'rate_limit' | 'forbidden' | 'bad_request' | 'server' | 'unknown';
  constructor(message: string, status: number, code: GitHubError['code']) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface RepoMeta {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  visibility: string;
  sizeKB: number;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Parse the many accepted URL forms into {owner, repo}. PRD §13.1. */
export function parseRepoUrl(input: string): RepoRef | null {
  if (!input) return null;
  let s = input.trim();
  s = s.replace(/^git@github\.com:/, 'https://github.com/');
  s = s.replace(/\.git$/, '');
  // Strip protocol + host if present.
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^github\.com\//, '');
  // Now expect "owner/repo[/...]" or already-clean "owner/repo".
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo };
}

function headers(pat?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ArchDecision',
  };
  const token = pat || process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(path: string, pat?: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${GH}${path}`, { headers: headers(pat) });
  } catch {
    throw new GitHubError('Could not reach GitHub. Check your connection and try again.', 0, 'server');
  }
  if (res.ok) return res;

  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 403 && remaining === '0') {
    throw new GitHubError(
      'GitHub rate limit reached. Add a personal access token to raise the limit to 5000/hr.',
      403,
      'rate_limit',
    );
  }
  if (res.status === 404) {
    throw new GitHubError('Repository not found — it may be private. Add a token to access it.', 404, 'not_found');
  }
  if (res.status === 401 || res.status === 403) {
    throw new GitHubError('Access denied by GitHub. Check that your token is valid and has repo scope.', res.status, 'forbidden');
  }
  if (res.status >= 500) {
    throw new GitHubError('GitHub is having trouble right now. Please try again in a moment.', res.status, 'server');
  }
  throw new GitHubError(`GitHub request failed (${res.status}).`, res.status, 'unknown');
}

/** GET repo metadata. Retries once on 5xx (PRD §18). */
export async function getRepoMeta(ref: RepoRef, pat?: string): Promise<RepoMeta> {
  const path = `/repos/${ref.owner}/${ref.repo}`;
  let res: Response;
  try {
    res = await ghFetch(path, pat);
  } catch (e) {
    if (e instanceof GitHubError && e.code === 'server') {
      res = await ghFetch(path, pat); // single retry
    } else {
      throw e;
    }
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    owner: ref.owner,
    repo: ref.repo,
    defaultBranch: (data.default_branch as string) || 'main',
    description: (data.description as string) || null,
    primaryLanguage: (data.language as string) || null,
    visibility: (data.visibility as string) || 'public',
    sizeKB: (data.size as number) || 0,
  };
}

export interface TreeResult {
  sha: string;
  nodes: FileNode[];
  truncated: boolean;
}

/** GET the full recursive tree in one call (PRD §13.3). */
export async function getTree(ref: RepoRef, branch: string, pat?: string): Promise<TreeResult> {
  const res = await ghFetch(`/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, pat);
  const data = (await res.json()) as { sha: string; truncated: boolean; tree: Array<Record<string, unknown>> };
  const nodes: FileNode[] = (data.tree || []).map((t) => ({
    path: t.path as string,
    type: t.type === 'tree' ? 'dir' : 'file',
    size: (t.size as number) || 0,
  }));
  return { sha: data.sha, nodes, truncated: !!data.truncated };
}

/** GET decoded contents of a single file at a ref. Returns null on any failure (best-effort). */
export async function getFileContent(ref: RepoRef, path: string, sha: string, pat?: string): Promise<string | null> {
  try {
    const res = await ghFetch(`/repos/${ref.owner}/${ref.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(sha)}`, pat);
    const data = (await res.json()) as { content?: string; encoding?: string };
    if (!data.content) return null;
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return data.content;
  } catch {
    return null;
  }
}

/** GET language byte breakdown. Best-effort. */
export async function getLanguages(ref: RepoRef, pat?: string): Promise<Record<string, number>> {
  try {
    const res = await ghFetch(`/repos/${ref.owner}/${ref.repo}/languages`, pat);
    return (await res.json()) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Fetch a PR's changed-files diff summary (stretch — PR review). */
export async function getPullRequestFiles(
  ref: RepoRef,
  prNumber: number,
  pat?: string,
): Promise<{ filename: string; status: string; patch?: string }[]> {
  const res = await ghFetch(`/repos/${ref.owner}/${ref.repo}/pulls/${prNumber}/files?per_page=100`, pat);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data.map((f) => ({
    filename: f.filename as string,
    status: f.status as string,
    patch: f.patch as string | undefined,
  }));
}

/** Parse a PR URL like https://github.com/owner/repo/pull/123 */
export function parsePrUrl(input: string): { ref: RepoRef; number: number } | null {
  const m = input.trim().match(/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/);
  if (!m) return null;
  return { ref: { owner: m[1], repo: m[2] }, number: parseInt(m[3], 10) };
}
