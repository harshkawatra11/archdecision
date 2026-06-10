// Frontend mirror of api/_lib/schema.ts. Keep the two in sync.

export type Confidence = 'high' | 'medium' | 'low';

export interface Evidence {
  type: 'dependency' | 'file' | 'config' | 'structure' | 'readme';
  ref: string;
  note: string;
}

export interface ADR {
  id: string;
  title: string;
  status: 'inferred';
  confidence: Confidence;
  context: string;
  decision: string;
  rationale: string;
  alternatives: { option: string; whyRejected: string }[];
  consequences: string[];
  evidence: Evidence[];
  category: string;
}

export interface ManifestFile {
  path: string;
  ecosystem: string;
  dependencies: string[];
}

export interface StructureSummary {
  topLevelDirs: string[];
  serviceCount: number;
  hasDocker: boolean;
  hasCI: boolean;
  testDirs: string[];
  largestFiles: { path: string; size: number }[];
}

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
  stats: { totalFiles: number; totalSizeKB: number; truncated: boolean };
  isMonorepo: boolean;
}

export interface AnalyzeResult {
  profileLite: RepoProfileLite;
  adrs: ADR[];
  sha: string;
}

export type PipelineStage = 'fetching' | 'structure' | 'signals' | 'inferring' | 'done';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { path: string; reason: string }[];
  considered?: string[];
  streaming?: boolean;
}

export interface PRFinding {
  adrId: string;
  severity: 'info' | 'warning' | 'conflict';
  summary: string;
  diffRefs: string[];
  reviewerQuestion: string;
}

export interface PRReview {
  prUrl: string;
  findings: PRFinding[];
  truncated: boolean;
}

export interface DriftFinding {
  title: string;
  adrId: string;
  severity: 'aligned' | 'minor' | 'major';
  observation: string;
  expectation: string;
  evidence: string[];
  recommendation: string;
}

export interface DriftMap {
  summary: string;
  findings: DriftFinding[];
}
