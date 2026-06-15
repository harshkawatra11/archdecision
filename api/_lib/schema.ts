// Canonical data shapes passed between layers (PRD §11).
// Frontend mirror lives in src/types.ts — keep the two in sync.

export type Confidence = 'high' | 'medium' | 'low';

export interface FileNode {
  path: string;
  type: 'file' | 'dir';
  size: number; // bytes, 0 for dirs
}

export interface ManifestFile {
  path: string; // e.g. "package.json"
  ecosystem: string; // "npm" | "pip" | "go" | "maven" | ...
  dependencies: string[]; // direct deps only for MVP
}

export interface SignalFile {
  path: string;
  content: string; // truncated to a per-file char cap
  truncated: boolean;
}

export interface StructureSummary {
  topLevelDirs: string[];
  serviceCount: number; // heuristic for monolith vs services
  hasDocker: boolean;
  hasCI: boolean;
  testDirs: string[];
  largestFiles: { path: string; size: number }[];
}

export interface RepoProfile {
  owner: string;
  repo: string;
  defaultBranch: string;
  sha: string; // commit analyzed, for cache + citation
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>; // bytes per language
  fileTree: FileNode[]; // path + type + size, NOT contents
  manifests: ManifestFile[];
  signalFiles: SignalFile[];
  readme: string | null;
  structureSummary: StructureSummary;
  stats: {
    totalFiles: number;
    totalSizeKB: number;
    truncated: boolean;
  };
}

// profileLite = profile minus heavy file contents, for client reuse + display.
export interface RepoProfileLite {
  owner: string;
  repo: string;
  defaultBranch: string;
  sha: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  manifests: ManifestFile[];
  structureSummary: StructureSummary;
  stats: RepoProfile['stats'];
  isMonorepo: boolean;
}

export interface Evidence {
  type: 'dependency' | 'file' | 'config' | 'structure' | 'readme';
  ref: string; // e.g. "package.json: pg@^8", or a path
  note: string; // why this is evidence
}

export interface ADR {
  id: string; // "ADR-001"
  title: string;
  status: 'inferred';
  confidence: Confidence;
  context: string;
  decision: string;
  rationale: string;
  alternatives: { option: string; whyRejected: string }[];
  consequences: string[];
  evidence: Evidence[];
  category: string; // "datastore" | "framework" | ...
}

export interface AnalyzeResponse {
  profileLite: RepoProfileLite;
  adrs: ADR[];
  sha: string;
}

export interface AskRequest {
  repoUrl: string;
  sha: string;
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  adrs?: ADR[]; // client may pass the generated ADRs so Ask can ground "why" questions in them
  pat?: string;
}

export interface AskSources {
  sources: { path: string; reason: string }[];
}

export interface OnboardingDoc {
  markdown: string;
  sections: string[];
}

export interface PRReview {
  prUrl: string;
  findings: {
    adrId: string;
    severity: 'info' | 'warning' | 'conflict';
    summary: string;
    diffRefs: string[];
    reviewerQuestion: string;
  }[];
  truncated: boolean;
}

// Feature E — Tech Debt Drift Map (PRD §7.5). Where the code has diverged from
// the architecture its own ADRs describe.
export interface DriftFinding {
  title: string; // e.g. "Service boundary eroded in api/"
  adrId: string; // related ADR id, or "" if none
  severity: 'aligned' | 'minor' | 'major';
  observation: string; // what the current code/metrics show
  expectation: string; // what the decision/intent implied
  evidence: string[]; // file paths or structural facts
  recommendation: string; // a concrete next step
}

export interface DriftMap {
  summary: string; // one-paragraph "architecture vs reality" overview
  findings: DriftFinding[];
}

// ---------------------------------------------------------------------------
// Validation — lightweight, no external deps. Coerces/repairs where safe and
// reports what is missing so the LLM layer can do a single repair retry.
// ---------------------------------------------------------------------------

export function validateAdrArray(value: unknown): { ok: true; adrs: ADR[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(value)) {
    return { ok: false, errors: ['Expected a JSON array of ADR objects.'] };
  }
  const adrs: ADR[] = [];
  value.forEach((raw, i) => {
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`ADR[${i}] is not an object.`);
      return;
    }
    const o = raw as Record<string, unknown>;
    const missing: string[] = [];
    if (!str(o.title)) missing.push('title');
    if (!str(o.context)) missing.push('context');
    if (!str(o.decision)) missing.push('decision');
    if (!str(o.rationale)) missing.push('rationale');
    if (!Array.isArray(o.evidence) || (o.evidence as unknown[]).length === 0) missing.push('evidence (>=1)');
    if (missing.length) {
      errors.push(`ADR[${i}] missing/empty: ${missing.join(', ')}.`);
      return;
    }
    const confidence = normalizeConfidence(o.confidence);
    adrs.push({
      id: str(o.id) || `ADR-${String(i + 1).padStart(3, '0')}`,
      title: o.title as string,
      status: 'inferred',
      confidence,
      context: o.context as string,
      decision: o.decision as string,
      rationale: o.rationale as string,
      alternatives: normalizeAlternatives(o.alternatives),
      consequences: normalizeStringArray(o.consequences),
      evidence: normalizeEvidence(o.evidence),
      category: str(o.category) || 'general',
    });
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, adrs };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeConfidence(v: unknown): Confidence {
  const s = String(v).toLowerCase();
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean);
}

function normalizeAlternatives(v: unknown): { option: string; whyRejected: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x !== 'object' || x === null) return null;
      const o = x as Record<string, unknown>;
      return { option: str(o.option), whyRejected: str(o.whyRejected) };
    })
    .filter((x): x is { option: string; whyRejected: string } => !!x && !!x.option);
}

function normalizeEvidence(v: unknown): Evidence[] {
  if (!Array.isArray(v)) return [];
  const allowed = new Set(['dependency', 'file', 'config', 'structure', 'readme']);
  return v
    .map((x) => {
      if (typeof x !== 'object' || x === null) return null;
      const o = x as Record<string, unknown>;
      const type = allowed.has(String(o.type)) ? (o.type as Evidence['type']) : 'structure';
      const ref = str(o.ref);
      if (!ref) return null;
      return { type, ref, note: str(o.note) };
    })
    .filter((x): x is Evidence => !!x);
}
