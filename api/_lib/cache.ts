// Best-effort in-memory RepoProfile cache, keyed by `${owner}/${repo}@${sha}`
// (PRD §9.4, §12.6). Survives within a warm serverless instance; rebuilds on cold start.

import type { RepoProfile, ADR } from './schema.js';

interface Entry {
  profile: RepoProfile;
  adrs?: ADR[];
  at: number;
}

const MAX_ENTRIES = 12;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

const store = new Map<string, Entry>();

function key(owner: string, repo: string, sha: string): string {
  return `${owner}/${repo}@${sha}`;
}

export function cacheProfile(profile: RepoProfile, adrs?: ADR[]): void {
  const k = key(profile.owner, profile.repo, profile.sha);
  store.set(k, { profile, adrs, at: Date.now() });
  // Evict oldest if over capacity.
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) store.delete(oldest[0]);
  }
}

export function getCached(owner: string, repo: string, sha: string): Entry | null {
  const k = key(owner, repo, sha);
  const e = store.get(k);
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) {
    store.delete(k);
    return null;
  }
  return e;
}
