// Builds a grounded mind-map for a scanned repo and lays out the *visible* part radially
// (deterministic, no dependency). Progressive disclosure: areas are always visible; a branch's
// decisions appear when the area is expanded, and a decision's evidence appears when it is expanded.
// Every node traces to real analyze output.

import type { ADR, Confidence, FolderInfo, RepoProfileLite } from '../types';

export type GNodeType = 'repo' | 'area' | 'decision' | 'evidence' | 'module' | 'language';
export type EvidenceType = 'dependency' | 'file' | 'config' | 'structure' | 'readme';

export interface GNode {
  id: string;
  label: string;
  type: GNodeType;
  r: number;
  color: string;
  branch?: string; // id of the area this node belongs to ('' for repo)
  parent?: string; // immediate parent id (for visibility)
  confidence?: Confidence;
  evType?: EvidenceType;
  note?: string;
  folder?: FolderInfo; // module nodes carry grounded folder facts
  category?: string;
  adrIndex?: number;
  ref?: string;
  // layout (filled by layoutVisible for visible nodes only)
  angle: number;
  x: number;
  y: number;
}

export type LinkKind = 'area' | 'decided' | 'evidence' | 'module' | 'lang';

export interface GLink {
  source: string;
  target: string;
  kind: LinkKind;
  color: string;
}

export interface Graph {
  nodes: GNode[];
  links: GLink[];
}

const AREA_LABELS: Record<string, string> = {
  datastore: 'Datastore', framework: 'Framework', backend: 'Backend', frontend: 'Frontend',
  architecture: 'Architecture', auth: 'Auth', api: 'API', caching: 'Caching', testing: 'Testing',
  cicd: 'CI / CD', structure: 'Structure', general: 'General',
};

const PALETTE = [
  '#58a6ff', '#3fb950', '#a371f7', '#f778ba', '#e3b341',
  '#ff7b72', '#39c5cf', '#bc8cff', '#7ee787', '#ffa657',
];
const MODULES_COLOR = '#79c0ff';
const LANG_COLOR = '#f0883e';

const RADIUS: Record<GNodeType, number> = {
  repo: 30, area: 17, decision: 13, module: 11, language: 10, evidence: 7,
};

const baseName = (p: string) => {
  const clean = p.split(':')[0].trim();
  const seg = clean.split('/').pop() || clean;
  return seg.length > 24 ? seg.slice(0, 23) + '…' : seg;
};
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function buildGraph(profile: RepoProfileLite, adrs: ADR[]): Graph {
  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const seen = new Set<string>();

  const add = (n: Omit<GNode, 'x' | 'y' | 'angle'>) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push({ ...n, x: 0, y: 0, angle: 0 });
  };
  const link = (source: string, target: string, kind: LinkKind, color: string) => {
    if (seen.has(source) && seen.has(target)) links.push({ source, target, kind, color });
  };

  add({ id: 'repo', label: `${profile.owner}/${profile.repo}`, type: 'repo', r: RADIUS.repo, color: '#3fb950', branch: '' });

  // Architecture areas (unique ADR categories).
  const cats: string[] = [];
  adrs.forEach((a) => {
    const c = a.category || 'general';
    if (!cats.includes(c)) cats.push(c);
  });
  const colorOf = new Map<string, string>();
  cats.forEach((c, i) => colorOf.set(c, PALETTE[i % PALETTE.length]));

  cats.forEach((c) => {
    const areaId = `area:${c}`;
    const color = colorOf.get(c)!;
    add({ id: areaId, label: AREA_LABELS[c] || c, type: 'area', r: RADIUS.area, color, branch: areaId, parent: 'repo', category: c });
    link('repo', areaId, 'area', color);
  });

  adrs.forEach((adr, i) => {
    const c = adr.category || 'general';
    const areaId = `area:${c}`;
    const color = colorOf.get(c)!;
    const decId = `adr:${i}`;
    add({
      id: decId, label: truncate(adr.title, 46), type: 'decision', r: RADIUS.decision, color,
      branch: areaId, parent: areaId, confidence: adr.confidence, category: c, adrIndex: i, note: adr.decision,
    });
    link(areaId, decId, 'decided', color);

    for (const ev of (adr.evidence || []).slice(0, 3)) {
      if (!ev?.ref) continue;
      const evId = `ev:${decId}:${ev.ref}`;
      add({
        id: evId, label: baseName(ev.ref), type: 'evidence', r: RADIUS.evidence, color,
        branch: areaId, parent: decId, evType: ev.type, ref: ev.ref, note: ev.note,
      });
      link(decId, evId, 'evidence', color);
    }
  });

  // Modules branch, with grounded folder facts.
  const folderByName = new Map((profile.folders || []).map((f) => [f.name, f]));
  const modules = (profile.structureSummary.topLevelDirs || []).filter((d) => !d.startsWith('.')).slice(0, 14);
  if (modules.length) {
    add({ id: 'area:__structure', label: 'Modules', type: 'area', r: RADIUS.area, color: MODULES_COLOR, branch: 'area:__structure', parent: 'repo' });
    link('repo', 'area:__structure', 'area', MODULES_COLOR);
    for (const d of modules) {
      const folder = folderByName.get(d);
      const note = folder
        ? `${folder.fileCount} file${folder.fileCount === 1 ? '' : 's'}${folder.topExtensions.length ? `, mostly .${folder.topExtensions[0]}` : ''}`
        : 'Top-level module';
      add({ id: `mod:${d}`, label: truncate(d, 18), type: 'module', r: RADIUS.module, color: MODULES_COLOR, branch: 'area:__structure', parent: 'area:__structure', note, folder });
      link('area:__structure', `mod:${d}`, 'module', MODULES_COLOR);
    }
  }

  // Languages branch, honest percentages only (>= 1%).
  const langEntries = Object.entries(profile.languages || {}).sort((a, b) => b[1] - a[1]);
  const totalBytes = langEntries.reduce((s, [, b]) => s + b, 0) || 1;
  const langs = langEntries
    .map(([name, bytes]) => ({ name, pct: (bytes / totalBytes) * 100 }))
    .filter((l) => l.pct >= 1)
    .slice(0, 6);
  if (langs.length) {
    add({ id: 'area:__stack', label: 'Languages', type: 'area', r: RADIUS.area, color: LANG_COLOR, branch: 'area:__stack', parent: 'repo' });
    link('repo', 'area:__stack', 'area', LANG_COLOR);
    for (const l of langs) {
      const pct = l.pct < 10 ? l.pct.toFixed(1) : Math.round(l.pct).toString();
      add({ id: `lang:${l.name}`, label: l.name, type: 'language', r: RADIUS.language, color: LANG_COLOR, branch: 'area:__stack', parent: 'area:__stack', note: `${pct}% of the codebase` });
      link('area:__stack', `lang:${l.name}`, 'lang', LANG_COLOR);
    }
  }

  return { nodes, links };
}

export interface LayoutOptions {
  width: number;
  height: number;
}

export interface VisibleGraph {
  nodes: GNode[]; // visible nodes, positioned
  links: GLink[]; // links among visible nodes
}

/**
 * Progressive-disclosure radial layout. `expanded` holds the ids of areas/decisions whose children
 * should be shown. Repo + all areas are always visible; an area's decisions show when it is expanded;
 * a decision's evidence shows when it is expanded. Only visible nodes are positioned.
 */
export function layoutVisible(graph: Graph, expanded: Set<string>, { width, height }: LayoutOptions): VisibleGraph {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const childrenOf = (id: string) => graph.links.filter((l) => l.source === id).map((l) => byId.get(l.target)!).filter(Boolean);

  // Determine visibility.
  const visible = new Set<string>(['repo']);
  graph.nodes.filter((n) => n.type === 'area').forEach((a) => visible.add(a.id));
  graph.nodes.forEach((n) => {
    if (n.type === 'decision' && n.branch && expanded.has(n.branch)) visible.add(n.id);
  });
  graph.nodes.forEach((n) => {
    if (n.type === 'evidence' && n.parent && expanded.has(n.parent) && expanded.has(n.branch!)) visible.add(n.id);
  });

  const cx = width / 2;
  const cy = height / 2;
  const repo = byId.get('repo')!;
  repo.x = cx;
  repo.y = cy;
  repo.angle = 0;

  const R1 = Math.min(width, height) * 0.2;
  const R2 = Math.min(width, height) * 0.37;
  const R3 = Math.min(width, height) * 0.49;

  const visibleChildren = (id: string) => childrenOf(id).filter((n) => visible.has(n.id));

  const areas = graph.nodes.filter((n) => n.type === 'area');
  // Weight a branch by how much it currently shows: collapsed = 1, expanded = its visible subtree.
  const weightOf = (a: GNode) => {
    if (!expanded.has(a.id)) return 1.4;
    return Math.max(1.6, visibleChildren(a.id).reduce((s, k) => s + 1 + 0.6 * visibleChildren(k.id).length, 0));
  };
  const weights = areas.map(weightOf);
  const totalW = weights.reduce((s, w) => s + w, 0) || 1;
  const gapPer = 0.06;
  const usable = Math.PI * 2 - gapPer * areas.length;

  let cursor = -Math.PI / 2;
  areas.forEach((a, i) => {
    const span = (weights[i] / totalW) * usable;
    const start = cursor + gapPer / 2;
    a.angle = start + span / 2;
    a.x = cx + Math.cos(a.angle) * R1;
    a.y = cy + Math.sin(a.angle) * R1;

    if (expanded.has(a.id)) {
      const kids = visibleChildren(a.id);
      const innerSpan = span * 0.86;
      const kidW = kids.map((k) => 1 + 0.6 * visibleChildren(k.id).length);
      const kidTotal = kidW.reduce((s, w) => s + w, 0) || 1;
      let c2 = start + span * 0.07;
      kids.forEach((k, j) => {
        const ks = (kidW[j] / kidTotal) * innerSpan;
        const ka = c2 + ks / 2;
        k.angle = ka;
        k.x = cx + Math.cos(ka) * R2;
        k.y = cy + Math.sin(ka) * R2;

        const evs = visibleChildren(k.id);
        if (evs.length) {
          const evSpan = ks * 0.8;
          evs.forEach((e, m) => {
            const tt = evs.length === 1 ? 0.5 : m / (evs.length - 1);
            const ea = ka - evSpan / 2 + tt * evSpan;
            const rr = R3 + (m % 2) * 30;
            e.angle = ea;
            e.x = cx + Math.cos(ea) * rr;
            e.y = cy + Math.sin(ea) * rr;
          });
        }
        c2 += ks;
      });
    }

    cursor = start + span + gapPer / 2;
  });

  const nodes = graph.nodes.filter((n) => visible.has(n.id));
  const links = graph.links.filter((l) => visible.has(l.source) && visible.has(l.target));
  return { nodes, links };
}

/** Bounding box of laid-out nodes (with radii), for fit-to-view. */
export function graphBounds(nodes: GNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.r);
    minY = Math.min(minY, n.y - n.r);
    maxX = Math.max(maxX, n.x + n.r);
    maxY = Math.max(maxY, n.y + n.r);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

/** True when a node can be expanded to reveal children (and how many). */
export function childCount(graph: Graph, id: string): number {
  return graph.links.filter((l) => l.source === id && (l.kind === 'decided' || l.kind === 'evidence')).length;
}
