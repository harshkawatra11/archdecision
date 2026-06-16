// RepoProfile helpers: structure summary, manifest parsing, token budgeting (PRD §13.6–13.8).

import type { FileNode, FolderInfo, ManifestFile, RepoProfile, RepoProfileLite, StructureSummary } from './schema.js';

/** Rough token estimate: ~4 chars/token. Good enough for defensive budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MANIFEST_ECOSYSTEMS: Record<string, string> = {
  'package.json': 'npm',
  'requirements.txt': 'pip',
  'pyproject.toml': 'pip',
  'Pipfile': 'pip',
  'go.mod': 'go',
  'pom.xml': 'maven',
  'build.gradle': 'gradle',
  'build.gradle.kts': 'gradle',
  'Cargo.toml': 'cargo',
  'Gemfile': 'rubygems',
  'composer.json': 'composer',
};

export function manifestEcosystem(path: string): string | null {
  const name = path.split('/').pop() || '';
  return MANIFEST_ECOSYSTEMS[name] ?? null;
}

/** Parse direct dependencies from a manifest's raw content. Best-effort, per-ecosystem. */
export function parseManifest(path: string, content: string): ManifestFile | null {
  const ecosystem = manifestEcosystem(path);
  if (!ecosystem) return null;
  const name = path.split('/').pop() || '';
  let dependencies: string[] = [];

  try {
    if (name === 'package.json' || name === 'composer.json') {
      const json = JSON.parse(content);
      const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}), ...(json.require || {}) };
      dependencies = Object.keys(deps);
    } else if (name === 'requirements.txt') {
      dependencies = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('-'))
        .map((l) => l.split(/[<>=!~ \[]/)[0].trim())
        .filter(Boolean);
    } else if (name === 'pyproject.toml' || name === 'Cargo.toml' || name === 'Pipfile') {
      // Grab dependency-table keys: lines like `name = "..."` under a deps section.
      dependencies = parseTomlDeps(content);
    } else if (name === 'go.mod') {
      dependencies = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('require ') || /^\t?[\w.\-/]+\sv\d/.test(l))
        .map((l) => l.replace(/^require\s+/, '').split(/\s+/)[0])
        .filter((d) => d && d !== '(' && d !== ')');
    } else if (name === 'Gemfile') {
      dependencies = [...content.matchAll(/gem\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    } else if (name === 'pom.xml') {
      dependencies = [...content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map((m) => m[1].trim());
    } else if (name.startsWith('build.gradle')) {
      dependencies = [...content.matchAll(/(?:implementation|api|compile|testImplementation)\s*[(\s]['"]([^'"]+)['"]/g)].map(
        (m) => m[1],
      );
    }
  } catch {
    dependencies = [];
  }

  // De-dupe + cap to keep the profile compact.
  dependencies = [...new Set(dependencies)].slice(0, 80);
  return { path, ecosystem, dependencies };
}

function parseTomlDeps(content: string): string[] {
  const deps: string[] = [];
  const lines = content.split('\n');
  let inDeps = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      // Enter on any [...dependencies] / [...packages] section header.
      inDeps = /dependencies|packages/i.test(line);
      continue;
    }
    if (!inDeps || !line || line.startsWith('#')) continue;
    const m = line.match(/^["']?([\w.\-]+)["']?\s*=/);
    if (m) deps.push(m[1]);
  }
  return deps;
}

const DIR_OF = (path: string): string => {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
};

/** Compute structureSummary from the file tree (PRD §13.7). */
export function computeStructureSummary(nodes: FileNode[], manifestPaths: string[]): StructureSummary {
  const topLevelDirs = [
    ...new Set(nodes.filter((n) => n.type === 'dir' && !n.path.includes('/')).map((n) => n.path)),
  ].sort();

  // serviceCount: distinct directories (other than root) that contain their own manifest.
  const manifestDirs = new Set(manifestPaths.map(DIR_OF).filter((d) => d !== ''));
  const serviceCount = manifestDirs.size;

  const lower = nodes.map((n) => n.path.toLowerCase());
  const hasDocker = lower.some((p) => p.endsWith('dockerfile') || p.endsWith('docker-compose.yml') || p.endsWith('docker-compose.yaml'));
  const hasCI = lower.some((p) => p.includes('.github/workflows/') || p === '.gitlab-ci.yml' || p.includes('.circleci/'));

  const testDirs = [
    ...new Set(
      nodes
        .filter((n) => n.type === 'dir' && /(^|\/)(tests?|__tests__|spec)$/i.test(n.path))
        .map((n) => n.path),
    ),
  ].sort();

  const largestFiles = nodes
    .filter((n) => n.type === 'file')
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map((n) => ({ path: n.path, size: n.size }));

  return { topLevelDirs, serviceCount, hasDocker, hasCI, testDirs, largestFiles };
}

/** Grounded per-folder facts for each top-level directory, computed from the file tree. */
export function computeFolders(nodes: FileNode[], topLevelDirs: string[]): FolderInfo[] {
  return topLevelDirs.map((dir) => {
    const prefix = dir + '/';
    const files = nodes.filter((n) => n.type === 'file' && n.path.startsWith(prefix));
    const bytes = files.reduce((s, f) => s + f.size, 0);

    // Immediate subdirectories (exactly one path segment below dir).
    const subdirs = [
      ...new Set(
        nodes
          .filter((n) => n.type === 'dir' && n.path.startsWith(prefix) && n.path.slice(prefix.length).indexOf('/') === -1)
          .map((n) => n.path.slice(prefix.length)),
      ),
    ]
      .sort()
      .slice(0, 6);

    // Dominant file extensions.
    const extCount = new Map<string, number>();
    for (const f of files) {
      const name = f.path.split('/').pop() || '';
      const dot = name.lastIndexOf('.');
      if (dot > 0) {
        const ext = name.slice(dot + 1).toLowerCase();
        if (ext.length <= 8) extCount.set(ext, (extCount.get(ext) || 0) + 1);
      }
    }
    const topExtensions = [...extCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([e]) => e);

    return { name: dir, fileCount: files.length, sizeKB: Math.round(bytes / 1024), subdirs, topExtensions };
  });
}

/** Derive the client-facing lite profile (no heavy file contents). */
export function toLite(profile: RepoProfile): RepoProfileLite {
  return {
    owner: profile.owner,
    repo: profile.repo,
    defaultBranch: profile.defaultBranch,
    sha: profile.sha,
    description: profile.description,
    primaryLanguage: profile.primaryLanguage,
    languages: profile.languages,
    manifests: profile.manifests,
    structureSummary: profile.structureSummary,
    folders: computeFolders(profile.fileTree, profile.structureSummary.topLevelDirs),
    stats: profile.stats,
    isMonorepo: profile.structureSummary.serviceCount >= 2,
  };
}

/**
 * Serialize a RepoProfile to the compact, structured context we feed the model.
 * This is the grounding/compression layer (PRD §14.1).
 */
export function profileForPrompt(profile: RepoProfile): string {
  const treePreview = profile.fileTree
    .filter((n) => n.type === 'file')
    .slice(0, 1200)
    .map((n) => n.path)
    .join('\n');

  const manifests = profile.manifests
    .map((m) => `- ${m.path} [${m.ecosystem}]: ${m.dependencies.join(', ') || '(none parsed)'}`)
    .join('\n');

  const signals = profile.signalFiles
    .map((f) => `\n### FILE: ${f.path}${f.truncated ? ' (truncated)' : ''}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n');

  return [
    `REPOSITORY: ${profile.owner}/${profile.repo}`,
    `Description: ${profile.description || '(none)'}`,
    `Primary language: ${profile.primaryLanguage || 'unknown'}`,
    `Languages (bytes): ${JSON.stringify(profile.languages)}`,
    `Default branch: ${profile.defaultBranch} @ ${profile.sha.slice(0, 10)}`,
    '',
    'STRUCTURE SUMMARY:',
    JSON.stringify(profile.structureSummary, null, 2),
    '',
    `STATS: ${profile.stats.totalFiles} files, ${profile.stats.totalSizeKB} KB${profile.stats.truncated ? ' (TRUNCATED — not all signal captured)' : ''}`,
    '',
    'DEPENDENCY MANIFESTS (the richest decision signal):',
    manifests || '(no recognized manifests found)',
    '',
    'README:',
    profile.readme ? profile.readme.slice(0, 16000) : '(no README found)',
    '',
    'FILE TREE (paths only, sample):',
    treePreview,
    '',
    'SIGNAL FILE CONTENTS:',
    signals || '(no signal files captured)',
  ].join('\n');
}
