// The repo ingestion pipeline — turns a GitHub repo into a grounded RepoProfile (PRD §13).

import {
  getFileContent,
  getLanguages,
  getRepoMeta,
  getTree,
  type RepoRef,
} from './github.js';
import { computeStructureSummary, estimateTokens, manifestEcosystem, parseManifest } from './profile.js';
import type { FileNode, RepoProfile, SignalFile } from './schema.js';

const PER_FILE_CHAR_CAP = 8000; // ~2k tokens/file
const MAX_SIGNAL_FILES = 20;
const TOKEN_BUDGET = 40_000; // Gemini free tier supports 1M context; 40k leaves ample room

const MANIFEST_NAMES = new Set([
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Cargo.toml',
  'Gemfile',
  'composer.json',
]);

const INFRA_NAMES = new Set([
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'vercel.json',
  'serverless.yml',
  'nginx.conf',
  'Procfile',
  'Makefile',
  'netlify.toml',
]);

const baseName = (p: string) => p.split('/').pop() || p;
const isWorkflow = (p: string) => /^\.github\/workflows\/.+\.ya?ml$/.test(p);
const isTerraform = (p: string) => p.endsWith('.tf');
const isArchDoc = (p: string) => /^docs\/(adr|architecture)/i.test(p) || /^docs\/.*architecture/i.test(p);
const isRootReadme = (p: string) => /^readme(\.md|\.rst|\.txt)?$/i.test(p);

const ENTRY_PATTERNS = [
  /(^|\/)(main|index|app|server)\.(ts|tsx|js|jsx|py|go|rb|java|rs|php)$/,
  /(^|\/)schema\.(ts|js|py|sql|prisma|graphql)$/,
  /(^|\/)(models|routes|controllers)\//,
];

export interface IngestProgress {
  (stage: 'fetching' | 'structure' | 'signals' | 'inferring' | 'done', detail?: string): void;
}

export interface RepoNotFoundSignal {
  insufficient: boolean;
  reason?: string;
}

/** Rank a tree path by signal tier (lower = higher priority). Returns null to skip. */
function tier(node: FileNode): number | null {
  if (node.type !== 'file') return null;
  const p = node.path;
  const name = baseName(p);
  // Skip vendored / generated noise.
  if (/(^|\/)(node_modules|vendor|dist|build|\.next|\.venv|target|__pycache__)\//.test(p)) return null;
  if (MANIFEST_NAMES.has(name)) return 1;
  if (INFRA_NAMES.has(name) || isWorkflow(p) || isTerraform(p)) return 2;
  if (isRootReadme(p) && !p.includes('/')) return 3;
  if (isArchDoc(p)) return 3;
  if (ENTRY_PATTERNS.some((re) => re.test(p))) return 4;
  return null;
}

/** Select signal files in priority order within a budget (PRD §13.4). */
export function selectSignalFiles(nodes: FileNode[]): FileNode[] {
  const ranked = nodes
    .map((n) => ({ n, t: tier(n) }))
    .filter((x): x is { n: FileNode; t: number } => x.t !== null)
    // Within a tier, prefer shallower paths (more central) then smaller files.
    .sort((a, b) => a.t - b.t || a.n.path.split('/').length - b.n.path.split('/').length || a.n.size - b.n.size);

  return ranked.slice(0, MAX_SIGNAL_FILES + 10).map((x) => x.n); // a little headroom; budget trims later
}

/** Full ingestion. Calls onProgress as stages complete. */
export async function buildRepoProfile(
  ref: RepoRef,
  pat: string | undefined,
  onProgress?: IngestProgress,
): Promise<RepoProfile> {
  onProgress?.('fetching', `Fetching ${ref.owner}/${ref.repo}`);
  const meta = await getRepoMeta(ref, pat);
  const [tree, languages] = await Promise.all([getTree(ref, meta.defaultBranch, pat), getLanguages(ref, pat)]);

  onProgress?.('structure', `Reading ${tree.nodes.length} paths`);
  const sha = tree.sha;

  const selected = selectSignalFiles(tree.nodes);
  onProgress?.('signals', `Identifying ${selected.length} signal files`);

  // Fetch contents with limited concurrency.
  const contents = await fetchWithConcurrency(selected, 5, (node) =>
    getFileContent(ref, node.path, sha, pat).then((content) => ({ node, content })),
  );

  const manifests = [];
  const signalFiles: SignalFile[] = [];
  let readme: string | null = null;
  let usedTokens = 0;

  // Process in tier order (already sorted in `selected`).
  for (const { node, content } of contents) {
    if (content == null) continue;
    const name = baseName(node.path);

    if (manifestEcosystem(node.path)) {
      const parsed = parseManifest(node.path, content);
      if (parsed) manifests.push(parsed);
    }

    if (isRootReadme(node.path) && !node.path.includes('/')) {
      readme = content.slice(0, PER_FILE_CHAR_CAP * 2);
      continue; // README stored separately, not as a signal file
    }

    const truncated = content.length > PER_FILE_CHAR_CAP;
    const sliced = truncated ? content.slice(0, PER_FILE_CHAR_CAP) : content;
    const cost = estimateTokens(sliced);

    // Token budget: once exceeded, stop adding tier-4 source; manifests/infra already captured first.
    if (usedTokens + cost > TOKEN_BUDGET && signalFiles.length >= 8) {
      continue;
    }
    usedTokens += cost;
    signalFiles.push({ path: node.path, content: sliced, truncated });
    void name;
  }

  const manifestPaths = manifests.map((m) => m.path);
  const structureSummary = computeStructureSummary(tree.nodes, manifestPaths);

  const totalFiles = tree.nodes.filter((n) => n.type === 'file').length;
  const totalSizeKB = Math.round(tree.nodes.reduce((sum, n) => sum + n.size, 0) / 1024);

  onProgress?.('inferring', 'Building repo profile');

  const profile: RepoProfile = {
    owner: ref.owner,
    repo: ref.repo,
    defaultBranch: meta.defaultBranch,
    sha,
    description: meta.description,
    primaryLanguage: meta.primaryLanguage,
    languages,
    fileTree: tree.nodes,
    manifests,
    signalFiles,
    readme,
    structureSummary,
    stats: {
      totalFiles,
      totalSizeKB,
      truncated: tree.truncated || usedTokens >= TOKEN_BUDGET,
    },
  };

  return profile;
}

/** Does this profile carry enough signal to infer real decisions? (PRD §18 empty-repo case) */
export function hasSufficientSignal(profile: RepoProfile): boolean {
  return (
    profile.manifests.length > 0 ||
    profile.signalFiles.length >= 2 ||
    !!profile.readme ||
    profile.stats.totalFiles >= 5
  );
}

async function fetchWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}
